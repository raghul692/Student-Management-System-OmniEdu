import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { AdmissionStatus, StudentStatus } from '@prisma/client';
import { logAuditEvent } from '../audit/audit.service';

export interface CreateAdmissionInput {
  applicantName: string;
  gender: string;
  dob?: string;
  email?: string;
  phone?: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  address?: string;
  appliedStandard?: number;
  appliedDeptId?: string;
  academicYear: string;
  previousSchool?: string;
  documents?: any;
}

export async function listAdmissions(query: { status?: AdmissionStatus; search?: string }) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const where: any = { institutionId };
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { applicantName: { contains: query.search, mode: 'insensitive' } },
      { applicationNo: { contains: query.search, mode: 'insensitive' } },
      { guardianPhone: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return prisma.studentAdmission.findMany({
    where,
    include: { student: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAdmissionDetails(id: string) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const admission = await prisma.studentAdmission.findFirst({
    where: { id, institutionId },
    include: { student: true },
  });
  if (!admission) throw new AppError('Admission application not found', 404);
  return admission;
}

export async function submitAdmission(input: CreateAdmissionInput) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const count = await prisma.studentAdmission.count();
  const year = new Date().getFullYear();
  const applicationNo = `APP-${year}-${String(count + 1).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;

  const admission = await prisma.studentAdmission.create({
    data: {
      institutionId,
      applicationNo,
      applicantName: input.applicantName,
      gender: input.gender,
      dob: input.dob ? new Date(input.dob) : undefined,
      email: input.email,
      phone: input.phone,
      guardianName: input.guardianName,
      guardianPhone: input.guardianPhone,
      guardianEmail: input.guardianEmail,
      address: input.address,
      appliedStandard: input.appliedStandard,
      appliedDeptId: input.appliedDeptId,
      academicYear: input.academicYear,
      previousSchool: input.previousSchool,
      status: AdmissionStatus.SUBMITTED,
      documents: input.documents,
    },
  });

  await logAuditEvent({
    action: 'ADMISSION_APPLICATION_SUBMITTED',
    entityType: 'StudentAdmission',
    entityId: admission.id,
    details: { applicationNo, applicantName: input.applicantName },
  });

  return admission;
}

export async function reviewAdmission(
  id: string,
  input: {
    status: AdmissionStatus;
    reviewNotes?: string;
    classId?: string; // If school, assigned section
    rollOrRegNo?: string;
  }
) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const admission = await prisma.studentAdmission.findFirst({
    where: { id, institutionId },
  });
  if (!admission) throw new AppError('Admission application not found', 404);

  if (input.status === AdmissionStatus.APPROVED) {
    // Transactionally approve and create the student record
    const result = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const admCount = await tx.student.count({ where: { institutionId } });
      const admissionNumber = `ADM-${year}-${String(admCount + 1).padStart(4, '0')}`;

      // Create new student
      const student = await tx.student.create({
        data: {
          institutionId,
          fullName: admission.applicantName,
          gender: admission.gender,
          dob: admission.dob,
          email: admission.email,
          phone: admission.phone,
          guardianName: admission.guardianName,
          guardianPhone: admission.guardianPhone,
          address: admission.address,
          status: StudentStatus.ACTIVE,
          isActive: true,
          deptId: admission.appliedDeptId,
          semester: admission.appliedDeptId ? 1 : undefined,
          classId: input.classId,
          regNumber: admission.appliedDeptId ? (input.rollOrRegNo || admissionNumber) : undefined,
          rollNumber: !admission.appliedDeptId ? (input.rollOrRegNo || `ROLL-${admCount + 1}`) : undefined,
        },
      });

      // Update admission record
      const updated = await tx.studentAdmission.update({
        where: { id },
        data: {
          status: AdmissionStatus.APPROVED,
          admissionNumber,
          studentId: student.id,
          reviewedBy: ctx.userId,
          reviewNotes: input.reviewNotes,
        },
      });

      // Automatically assign initial fee structure if available
      const feeStructure = await tx.feeStructure.findFirst({
        where: {
          institutionId,
          OR: [
            { deptId: admission.appliedDeptId },
            { academicYear: admission.academicYear },
          ],
        },
        include: { categories: true },
      });

      if (feeStructure) {
        const totalAmount = feeStructure.categories.reduce((sum, c) => sum + c.amount, 0);
        await tx.studentFeeAssignment.create({
          data: {
            institutionId,
            studentId: student.id,
            feeStructureId: feeStructure.id,
            totalAmount,
            discountAmount: 0,
            scholarshipAmount: 0,
            netPayable: totalAmount,
          },
        });
      }

      return { admission: updated, student };
    });

    await logAuditEvent({
      action: 'ADMISSION_APPLICATION_APPROVED',
      entityType: 'StudentAdmission',
      entityId: id,
      details: { admissionNumber: result.admission.admissionNumber, studentId: result.student.id },
    });

    return result;
  }

  // Under review or rejected
  const updated = await prisma.studentAdmission.update({
    where: { id },
    data: {
      status: input.status,
      reviewedBy: ctx.userId,
      reviewNotes: input.reviewNotes,
    },
  });

  await logAuditEvent({
    action: `ADMISSION_APPLICATION_${input.status}`,
    entityType: 'StudentAdmission',
    entityId: id,
    details: { status: input.status, reviewNotes: input.reviewNotes },
  });

  return { admission: updated };
}
