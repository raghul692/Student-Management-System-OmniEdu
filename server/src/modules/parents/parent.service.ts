import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { logAuditEvent } from '../audit/audit.service';

export async function getParentChildren(parentUserId: string) {
  const ctx = requireInstitutionContext();
  const links = await prisma.parentStudentLink.findMany({
    where: {
      institutionId: ctx.institutionId,
      parentUserId,
      isVerified: true,
    },
    include: {
      student: {
        include: {
          department: { select: { id: true, name: true, code: true } },
          schoolClass: { select: { id: true, standard: true, section: true } },
        },
      },
    },
    orderBy: { isPrimary: 'desc' },
  });

  return links.map((link) => ({
    linkId: link.id,
    relationship: link.relationship,
    isPrimary: link.isPrimary,
    student: {
      id: link.student.id,
      fullName: link.student.fullName,
      regNumber: link.student.regNumber,
      rollNumber: link.student.rollNumber,
      email: link.student.email,
      phone: link.student.phone,
      batchYear: link.student.batchYear,
      gender: link.student.gender,
      department: link.student.department,
      schoolClass: link.student.schoolClass,
      semester: link.student.semester,
    },
  }));
}

export async function getChildAcademicSummary(parentUserId: string, studentId: string) {
  const ctx = requireInstitutionContext();

  // Strict authorization check: ensure parent is linked to this specific student
  const link = await prisma.parentStudentLink.findFirst({
    where: {
      institutionId: ctx.institutionId,
      parentUserId,
      studentId,
      isVerified: true,
    },
  });

  if (!link && ctx.systemRole !== 'ORG_ADMIN' && ctx.systemRole !== 'PLATFORM_ADMIN') {
    throw new AppError('Forbidden. You are not authorized to access this student record.', 403);
  }

  // Fetch student
  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId: ctx.institutionId },
    include: {
      department: { select: { id: true, name: true, code: true } },
      schoolClass: { select: { id: true, standard: true, section: true } },
    },
  });

  if (!student) {
    throw new AppError('Student not found in this institution.', 404);
  }

  // Attendance metrics
  const totalAttendance = await prisma.attendance.count({
    where: { studentId, institutionId: ctx.institutionId },
  });

  const presentAttendance = await prisma.attendance.count({
    where: {
      studentId,
      institutionId: ctx.institutionId,
      status: { in: ['PRESENT', 'LATE', 'ON_DUTY'] },
    },
  });

  const percentage = totalAttendance > 0
    ? Number(((presentAttendance / totalAttendance) * 100).toFixed(1))
    : 100.0;

  const recentAttendance = await prisma.attendance.findMany({
    where: { studentId, institutionId: ctx.institutionId },
    orderBy: { date: 'desc' },
    take: 10,
    include: {
      course: { select: { courseCode: true, title: true } },
    },
  });

  // Marks records
  const marks = await prisma.markRecord.findMany({
    where: { studentId, institutionId: ctx.institutionId },
    include: {
      exam: { select: { title: true, type: true, academicYear: true } },
      course: { select: { courseCode: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Timetable
  const timetable = await prisma.timetableEntry.findMany({
    where: {
      institutionId: ctx.institutionId,
      ...(student.deptId ? { deptId: student.deptId } : {}),
      ...(student.classId ? { classId: student.classId } : {}),
    },
    include: {
      course: { select: { courseCode: true, title: true } },
      schoolClass: { select: { standard: true, section: true } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { slotNumber: 'asc' }],
  });

  return {
    student,
    attendance: {
      total: totalAttendance,
      present: presentAttendance,
      absent: totalAttendance - presentAttendance,
      percentage,
      recent: recentAttendance,
    },
    marks,
    timetable,
  };
}

export async function linkParentToStudent(data: {
  parentUserId: string;
  studentId: string;
  relationship?: string;
  isPrimary?: boolean;
}) {
  const ctx = requireInstitutionContext();
  const link = await prisma.parentStudentLink.upsert({
    where: {
      institutionId_parentUserId_studentId: {
        institutionId: ctx.institutionId,
        parentUserId: data.parentUserId,
        studentId: data.studentId,
      },
    },
    update: {
      relationship: data.relationship || 'PARENT',
      isPrimary: data.isPrimary ?? true,
      isVerified: true,
    },
    create: {
      institutionId: ctx.institutionId,
      parentUserId: data.parentUserId,
      studentId: data.studentId,
      relationship: data.relationship || 'PARENT',
      isPrimary: data.isPrimary ?? true,
      isVerified: true,
    },
  });

  await logAuditEvent({
    action: 'PARENT_STUDENT_LINKED',
    entityType: 'ParentStudentLink',
    entityId: link.id,
    details: { parentUserId: data.parentUserId, studentId: data.studentId },
  });

  return link;
}

// ─── Phase H: Extended Parent Portal Endpoints ────────────────────────────────

/** Verifies parent is linked to the student in this institution (called on every extended endpoint). */
async function assertParentLink(parentUserId: string, studentId: string, institutionId: string) {
  const link = await prisma.parentStudentLink.findFirst({
    where: { institutionId, parentUserId, studentId, isVerified: true },
  });
  if (!link) throw new AppError('Forbidden. You are not authorized to access this student record.', 403);
  return link;
}

export async function getChildAttendance(parentUserId: string, studentId: string) {
  const ctx = requireInstitutionContext();
  await assertParentLink(parentUserId, studentId, ctx.institutionId);
  const attendances = await prisma.attendance.findMany({
    where: { studentId, institutionId: ctx.institutionId },
    orderBy: { date: 'desc' },
    take: 60,
    select: { date: true, status: true, subjectName: true, period: true },
  });
  const total = attendances.length;
  const present = attendances.filter((a) => a.status === 'PRESENT' || a.status === 'ON_DUTY').length;
  return {
    percent: total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : null,
    total,
    present,
    absent: total - present,
    records: attendances,
  };
}

export async function getChildMarks(parentUserId: string, studentId: string) {
  const ctx = requireInstitutionContext();
  await assertParentLink(parentUserId, studentId, ctx.institutionId);
  return prisma.markRecord.findMany({
    where: { studentId, institutionId: ctx.institutionId },
    include: { exam: { select: { title: true, type: true, academicYear: true } } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
}

export async function getChildFees(parentUserId: string, studentId: string) {
  const ctx = requireInstitutionContext();
  await assertParentLink(parentUserId, studentId, ctx.institutionId);
  const assignments = await prisma.studentFeeAssignment.findMany({
    where: { studentId, institutionId: ctx.institutionId },
    include: {
      feeStructure: { select: { name: true, academicYear: true } },
      payments: { select: { amountPaid: true, paidAt: true, paymentMethod: true, receiptNumber: true }, orderBy: { paidAt: 'desc' } },
    },
  });
  const totalPayable = assignments.reduce((s, fa) => s + fa.netPayable, 0);
  const totalPaid = assignments.flatMap((fa) => fa.payments).reduce((s, p) => s + p.amountPaid, 0);
  return { totalPayable, totalPaid, outstanding: Math.max(0, totalPayable - totalPaid), assignments };
}

export async function getChildAssignments(parentUserId: string, studentId: string) {
  const ctx = requireInstitutionContext();
  await assertParentLink(parentUserId, studentId, ctx.institutionId);
  return prisma.assignmentSubmission.findMany({
    where: { studentId },
    include: {
      assignment: {
        select: { title: true, dueDate: true, subjectName: true, institutionId: true },
      },
    },
    orderBy: { submittedAt: 'desc' },
    take: 20,
  });
}

export async function getChildNotices(parentUserId: string, studentId: string) {
  const ctx = requireInstitutionContext();
  await assertParentLink(parentUserId, studentId, ctx.institutionId);
  return prisma.announcement.findMany({
    where: {
      institutionId: ctx.institutionId,
      scope: { in: ['INSTITUTION', 'EMERGENCY'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { id: true, title: true, content: true, scope: true, isPinned: true, createdAt: true, authorName: true },
  });
}
