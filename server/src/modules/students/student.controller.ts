import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as studentService from './student.service';
import { cacheService, CacheService } from '../../services/cache/cache.service';
import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';

const createStudentSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  guardianName: z.string().optional().nullable(),
  guardianPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  batchYear: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  dob: z.string().optional().nullable(),
  // College fields
  regNumber: z.string().optional().nullable(),
  deptId: z.string().uuid().optional().nullable(),
  programId: z.string().uuid().optional().nullable(),
  semester: z.number().int().min(1).max(8).optional().nullable(),
  regulationYear: z.string().optional().nullable(),
  // School fields
  rollNumber: z.string().optional().nullable(),
  classId: z.string().uuid().optional().nullable(),
});

export async function listStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const query: studentService.StudentListQuery = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      search: req.query.search as string | undefined,
      deptId: req.query.deptId as string | undefined,
      semester: req.query.semester ? parseInt(req.query.semester as string, 10) : undefined,
      classId: req.query.classId as string | undefined,
    };

    const result = await studentService.listStudents(query);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyStudentProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await studentService.getMyStudentProfile();
    return res.status(200).json({
      status: 'success',
      data: { student },
    });
  } catch (err) {
    next(err);
  }
}

export async function getStudentById(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await studentService.getStudentById(req.params.id);
    return res.status(200).json({
      status: 'success',
      data: { student },
    });
  } catch (err) {
    next(err);
  }
}

export async function createStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = createStudentSchema.parse(req.body);
    const student = await studentService.createStudent(validated);

    // Phase G: Invalidate tenant student cache
    const instId = req.selectedInstitutionId || student.institutionId || 'global';
    await cacheService.invalidatePrefix(CacheService.buildTenantPrefix(instId, 'students'));

    return res.status(201).json({
      status: 'success',
      data: { student },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = createStudentSchema.partial().parse(req.body);
    const student = await studentService.updateStudent(req.params.id, validated);

    // Phase G: Invalidate tenant student cache
    const instId = req.selectedInstitutionId || student.institutionId || 'global';
    await cacheService.invalidatePrefix(CacheService.buildTenantPrefix(instId, 'students'));

    return res.status(200).json({
      status: 'success',
      data: { student },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteStudent(req: Request, res: Response, next: NextFunction) {
  try {
    await studentService.deleteStudent(req.params.id);

    // Phase G: Invalidate tenant student cache
    const instId = req.selectedInstitutionId || 'global';
    await cacheService.invalidatePrefix(CacheService.buildTenantPrefix(instId, 'students'));

    return res.status(200).json({
      status: 'success',
      message: 'Student record deactivated successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateStudentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, reason } = req.body;
    if (!status) return res.status(400).json({ status: 'error', message: 'Status is required' });
    const student = await studentService.updateStudentStatus(req.params.id, status, reason);
    return res.status(200).json({ status: 'success', data: { student } });
  } catch (err) {
    next(err);
  }
}

export async function handlePromoteStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const { academicYear, studentIds, fromSemester, toSemester, fromClassId, toClassId } = req.body;
    if (!academicYear || !studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ status: 'error', message: 'academicYear and studentIds array are required' });
    }
    const result = await studentService.promoteStudents({
      academicYear,
      studentIds,
      fromSemester,
      toSemester,
      fromClassId,
      toClassId,
    });
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleAddStudentDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, documentType, fileUrl } = req.body;
    if (!title || !documentType || !fileUrl) {
      return res.status(400).json({ status: 'error', message: 'title, documentType, and fileUrl are required' });
    }
    const doc = await studentService.addStudentDocument(req.params.id, { title, documentType, fileUrl });
    return res.status(201).json({ status: 'success', data: { document: doc } });
  } catch (err) {
    next(err);
  }
}

export async function handleGetStudentDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const documents = await studentService.getStudentDocuments(req.params.id);
    return res.status(200).json({ status: 'success', data: { documents } });
  } catch (err) {
    next(err);
  }
}

/**
 * Phase H — Student 360° Aggregated Profile
 * RBAC: Staff → full view; Student → own data only; Parent endpoint separate.
 */
export async function getStudent360(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = requireInstitutionContext();
    const { institutionId } = ctx;
    const targetStudentId = req.params.id;

    // Students can only view their own 360
    if (ctx.institutionRole === 'STUDENT') {
      const selfStudent = await prisma.student.findFirst({
        where: { institutionId, userId: ctx.userId },
        select: { id: true },
      });
      if (!selfStudent || selfStudent.id !== targetStudentId) {
        throw new AppError('Students can only access their own 360° profile.', 403);
      }
    }

    // Parents can only view their verified linked child's 360
    if (ctx.institutionRole === 'PARENT') {
      const link = await prisma.parentStudentLink.findFirst({
        where: { institutionId, parentUserId: ctx.userId, studentId: targetStudentId, isVerified: true },
      });
      if (!link) {
        throw new AppError('Forbidden. Parents can only access their linked child profile.', 403);
      }
    }

    if (ctx.institutionRole === 'GUEST') throw new AppError('Insufficient permissions.', 403);

    const student = await prisma.student.findFirst({
      where: { id: targetStudentId, institutionId },
      include: {
        department: { select: { name: true } },
        schoolClass: { select: { standard: true, section: true } },
        attendances: { orderBy: { date: 'desc' }, take: 60, select: { date: true, status: true, subjectName: true } },
        marks: { orderBy: { createdAt: 'desc' }, take: 30, select: { subjectName: true, marksObtained: true, maxMarks: true, grade: true, isPassed: true, exam: { select: { type: true, title: true } } } },
        feeAssignments: {
          include: {
            feeStructure: { select: { name: true } },
            payments: { select: { amountPaid: true, paidAt: true } },
          },
        },
        assignmentSubmissions: {
          orderBy: { submittedAt: 'desc' },
          take: 10,
          select: { submittedAt: true, grade: true, assignment: { select: { title: true, dueDate: true } } },
        },
        parentLinks: { select: { parentUserId: true, relationship: true } },
      },
    });

    if (!student) throw new AppError('Student not found in this institution.', 404);

    // Compute summary metrics
    const totalAtt = student.attendances.length;
    const presentAtt = student.attendances.filter((a: { status: string }) => a.status === 'PRESENT' || a.status === 'ON_DUTY').length;
    const attendancePercent = totalAtt > 0 ? parseFloat(((presentAtt / totalAtt) * 100).toFixed(1)) : null;

    const failedMarks = student.marks.filter((m: { isPassed: boolean }) => !m.isPassed).length;
    const totalFeePayable = student.feeAssignments.reduce((s: number, fa: { netPayable: number }) => s + fa.netPayable, 0);
    const totalFeePaid = student.feeAssignments.flatMap((fa: { payments: { amountPaid: number }[] }) => fa.payments).reduce((s: number, p: { amountPaid: number }) => s + p.amountPaid, 0);

    // Latest AI risk (from DB cache)
    const latestRisk = await prisma.aiRiskPrediction.findFirst({
      where: { studentId: targetStudentId, institutionId },
      orderBy: { evaluatedAt: 'desc' },
      select: { riskScore: true, riskLevel: true, factors: true, recommendedAction: true, evaluatedAt: true },
    });

    // Staff-only: interventions
    let interventions: any[] = [];
    if (ctx.institutionRole !== 'STUDENT' && ctx.institutionRole !== 'PARENT') {
      interventions = await prisma.intervention.findMany({
        where: { studentId: targetStudentId, institutionId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, riskLevel: true, createdAt: true, updatedAt: true },
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        profile: {
          id: student.id,
          fullName: student.fullName,
          regNumber: student.regNumber,
          rollNumber: student.rollNumber,
          gender: student.gender,
          email: student.email,
          phone: student.phone,
          department: student.department?.name,
          schoolClass: student.schoolClass ? `${student.schoolClass.standard}-${student.schoolClass.section}` : null,
          batchYear: student.batchYear,
          semester: student.semester,
          isActive: student.isActive,
        },
        attendance: {
          percent: attendancePercent,
          totalRecords: totalAtt,
          recent: student.attendances.slice(0, 14),
        },
        academic: {
          failedSubjects: failedMarks,
          recentMarks: student.marks.slice(0, 15),
        },
        fees: {
          totalPayable: totalFeePayable,
          totalPaid: totalFeePaid,
          outstanding: Math.max(0, totalFeePayable - totalFeePaid),
        },
        assignments: {
          recent: student.assignmentSubmissions.slice(0, 10),
        },
        ai: {
          latestRisk: latestRisk ?? null,
        },
        interventions, // empty [] for student/parent callers
      },
    });
  } catch (err) {
    next(err);
  }
}
