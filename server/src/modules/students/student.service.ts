import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { calculateAttendanceMetrics } from '../../utils/attendanceDefaulter';
import { logAuditEvent } from '../audit/audit.service';

export interface StudentListQuery {
  page?: number;
  limit?: number;
  search?: string;
  deptId?: string;
  semester?: number;
  classId?: string;
}

export async function listStudents(query: StudentListQuery) {
  const ctx = requireInstitutionContext();
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {
    institutionId: ctx.institutionId,
    isActive: true,
  };

  // Apply role-based scope narrowing
  if (ctx.institutionRole === 'HOD' && ctx.deptId) {
    where.deptId = ctx.deptId;
  }
  if (ctx.institutionRole === 'CLASS_TEACHER' && ctx.classId) {
    where.classId = ctx.classId;
  }
  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot access the full student directory. Use /api/students/me.', 403);
  }
  if (ctx.institutionRole === 'PARENT') {
    throw new AppError('Forbidden. Parent-student listing is deferred to Phase B.', 403);
  }

  // Allow explicit query filters (within scope)
  if (query.deptId) {
    if (ctx.institutionRole === 'HOD' && ctx.deptId && query.deptId !== ctx.deptId) {
      throw new AppError('Forbidden. You cannot view students outside your department.', 403);
    }
    where.deptId = query.deptId;
  }
  if (query.semester) where.semester = query.semester;
  if (query.classId) {
    if (ctx.institutionRole === 'CLASS_TEACHER' && ctx.classId && query.classId !== ctx.classId) {
      throw new AppError('Forbidden. You cannot view students outside your assigned class.', 403);
    }
    where.classId = query.classId;
  }

  if (query.search) {
    where.OR = [
      { fullName: { contains: query.search, mode: 'insensitive' } },
      { regNumber: { contains: query.search, mode: 'insensitive' } },
      { rollNumber: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      include: {
        department: { select: { id: true, name: true, code: true } },
        schoolClass: { select: { id: true, standard: true, section: true } },
        program: { select: { id: true, name: true, code: true } },
        _count: { select: { attendances: true, marks: true } },
      },
      orderBy: [{ regNumber: 'asc' }, { rollNumber: 'asc' }, { fullName: 'asc' }],
    }),
  ]);

  return {
    students,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getStudentForUser(userId: string, institutionId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  return prisma.student.findFirst({
    where: {
      institutionId,
      OR: [
        { userId },
        { email: user.email.toLowerCase() },
      ],
    },
  });
}

export async function getMyStudentProfile() {
  const ctx = requireInstitutionContext();
  const student = await getStudentForUser(ctx.userId, ctx.institutionId);
  if (!student) {
    throw new AppError('No student record found linked to your account in this institution.', 404);
  }
  return getStudentById(student.id);
}

export async function getStudentById(id: string) {
  const ctx = requireInstitutionContext();

  // If caller is STUDENT, verify they are only requesting their own record
  if (ctx.institutionRole === 'STUDENT') {
    const myStudent = await getStudentForUser(ctx.userId, ctx.institutionId);
    if (!myStudent || myStudent.id !== id) {
      throw new AppError('Forbidden. Students may only access their own student record.', 403);
    }
  }

  if (ctx.institutionRole === 'PARENT') {
    const link = await prisma.parentStudentLink.findFirst({
      where: { institutionId: ctx.institutionId, parentUserId: ctx.userId, studentId: id },
    });
    if (!link) {
      throw new AppError('Forbidden. You may only view academic records for your linked ward.', 403);
    }
  }

  const student = await prisma.student.findFirst({
    where: { id, institutionId: ctx.institutionId },
    include: {
      department: true,
      schoolClass: true,
      program: true,
      attendances: { orderBy: { date: 'desc' }, take: 50 },
      marks: {
        include: { exam: true, course: true },
        orderBy: { createdAt: 'desc' },
      },
      documents: { orderBy: { uploadedAt: 'desc' } },
      promotions: { orderBy: { promotedAt: 'desc' } },
      feeAssignments: { include: { feeStructure: true, payments: true } },
    },
  });

  if (!student) throw new AppError('Student not found in this institution', 404);

  // Scope check for HOD
  if (ctx.institutionRole === 'HOD' && ctx.deptId && student.deptId && student.deptId !== ctx.deptId) {
    throw new AppError('Forbidden. HOD can only access students within their department.', 403);
  }

  // Scope check for Class Teacher
  if (ctx.institutionRole === 'CLASS_TEACHER' && ctx.classId && student.classId && student.classId !== ctx.classId) {
    throw new AppError('Forbidden. Class teacher can only access students within their assigned class.', 403);
  }

  const [totalAttendances, presentCount, onDutyCount, setting] = await Promise.all([
    prisma.attendance.count({ where: { studentId: id, institutionId: ctx.institutionId } }),
    prisma.attendance.count({ where: { studentId: id, institutionId: ctx.institutionId, status: 'PRESENT' } }),
    prisma.attendance.count({ where: { studentId: id, institutionId: ctx.institutionId, status: 'ON_DUTY' } }),
    prisma.institutionSetting.findUnique({ where: { institutionId: ctx.institutionId } }),
  ]);

  const threshold = setting?.attendanceThreshold ? Number(setting.attendanceThreshold) : 75.0;
  const attendanceSummary = calculateAttendanceMetrics(totalAttendances, presentCount, onDutyCount, threshold);

  return { ...student, attendanceSummary };
}

export async function updateStudentStatus(id: string, newStatus: any, reason?: string) {
  const ctx = requireInstitutionContext();
  const student = await prisma.student.findFirst({
    where: { id, institutionId: ctx.institutionId },
  });
  if (!student) throw new AppError('Student not found', 404);

  const updated = await prisma.student.update({
    where: { id },
    data: {
      status: newStatus,
      isActive: newStatus === 'ACTIVE',
    },
  });

  await logAuditEvent({
    action: 'STUDENT_LIFECYCLE_STATUS_CHANGED',
    entityType: 'Student',
    entityId: id,
    details: { oldStatus: student.status, newStatus, reason },
  });

  return updated;
}

export interface PromotionInput {
  academicYear: string;
  studentIds: string[];
  fromSemester?: number;
  toSemester?: number;
  fromClassId?: string;
  toClassId?: string;
}

export async function promoteStudents(input: PromotionInput) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (!input.studentIds || input.studentIds.length === 0) {
    throw new AppError('No students selected for promotion', 400);
  }

  const students = await prisma.student.findMany({
    where: { id: { in: input.studentIds }, institutionId, isActive: true },
  });

  if (students.length === 0) {
    throw new AppError('No valid students found for promotion', 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    const records = [];
    for (const student of students) {
      // Update student academic coordinates
      const updateData: any = {};
      if (input.toSemester !== undefined) {
        updateData.semester = input.toSemester;
      }
      if (input.toClassId) {
        updateData.classId = input.toClassId;
      }

      await tx.student.update({
        where: { id: student.id },
        data: updateData,
      });

      // Record promotion history
      const hist = await tx.studentPromotionHistory.create({
        data: {
          institutionId,
          studentId: student.id,
          academicYear: input.academicYear,
          fromSemester: input.fromSemester ?? student.semester,
          toSemester: input.toSemester,
          fromClassId: input.fromClassId ?? student.classId,
          toClassId: input.toClassId,
          promotedBy: ctx.userId,
          status: 'PROMOTED',
        },
      });
      records.push(hist);
    }
    return records;
  });

  await logAuditEvent({
    action: 'STUDENTS_BULK_PROMOTED',
    entityType: 'StudentPromotionHistory',
    details: { count: result.length, academicYear: input.academicYear, toSemester: input.toSemester, toClassId: input.toClassId },
  });

  return { promotedCount: result.length, promotions: result };
}

export async function addStudentDocument(studentId: string, data: { title: string; documentType: string; fileUrl: string }) {
  const ctx = requireInstitutionContext();
  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId: ctx.institutionId },
  });
  if (!student) throw new AppError('Student not found', 404);

  return prisma.studentDocument.create({
    data: {
      studentId,
      title: data.title,
      documentType: data.documentType,
      fileUrl: data.fileUrl,
    },
  });
}

export async function getStudentDocuments(studentId: string) {
  const ctx = requireInstitutionContext();
  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId: ctx.institutionId },
  });
  if (!student) throw new AppError('Student not found', 404);

  // Student self-scope check
  if (ctx.institutionRole === 'STUDENT') {
    const myStudent = await getStudentForUser(ctx.userId, ctx.institutionId);
    if (!myStudent || myStudent.id !== studentId) {
      throw new AppError('Forbidden. Students may only access their own documents.', 403);
    }
  }

  // Parent linked-ward check
  if (ctx.institutionRole === 'PARENT') {
    const link = await prisma.parentStudentLink.findFirst({
      where: { institutionId: ctx.institutionId, parentUserId: ctx.userId, studentId },
    });
    if (!link) {
      throw new AppError('Forbidden. You may only view documents for your linked ward.', 403);
    }
  }

  // HOD department scope check
  if (ctx.institutionRole === 'HOD' && ctx.deptId) {
    if (student.deptId !== ctx.deptId) {
      throw new AppError('Forbidden. HOD cannot access documents for students outside their department.', 403);
    }
  }

  // Class teacher scope check
  if (ctx.institutionRole === 'CLASS_TEACHER' && ctx.classId) {
    if (student.classId !== ctx.classId) {
      throw new AppError('Forbidden. Class teacher cannot access documents for students outside their assigned class.', 403);
    }
  }

  return prisma.studentDocument.findMany({
    where: { studentId },
    orderBy: { uploadedAt: 'desc' },
  });
}

export async function createStudent(data: any) {
  const ctx = requireInstitutionContext();
  return prisma.student.create({
    data: {
      institutionId: ctx.institutionId,
      fullName: data.fullName,
      gender: data.gender,
      email: data.email,
      phone: data.phone,
      guardianName: data.guardianName,
      guardianPhone: data.guardianPhone,
      address: data.address,
      batchYear: data.batchYear,
      photoUrl: data.photoUrl,
      dob: data.dob ? new Date(data.dob) : undefined,
      // College fields
      regNumber: data.regNumber,
      deptId: data.deptId,
      programId: data.programId,
      semester: data.semester,
      regulationYear: data.regulationYear,
      // School fields
      rollNumber: data.rollNumber,
      classId: data.classId,
    },
  });
}

export async function updateStudent(id: string, data: any) {
  const ctx = requireInstitutionContext();
  const student = await prisma.student.findFirst({ where: { id, institutionId: ctx.institutionId } });
  if (!student) throw new AppError('Student not found', 404);
  return prisma.student.update({ where: { id }, data });
}

export async function deleteStudent(id: string) {
  const ctx = requireInstitutionContext();
  const student = await prisma.student.findFirst({ where: { id, institutionId: ctx.institutionId } });
  if (!student) throw new AppError('Student not found', 404);
  return prisma.student.update({ where: { id }, data: { isActive: false, status: 'WITHDRAWN' } });
}
