import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { RegistrationStatus } from '@prisma/client';

export async function getAvailableCourses(studentId?: string) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  let targetStudentId = studentId;
  if (!targetStudentId && ctx.institutionRole === 'STUDENT') {
    const student = await prisma.student.findFirst({
      where: { userId: ctx.userId, institutionId },
    });
    targetStudentId = student?.id;
  }

  if (!targetStudentId) {
    throw new AppError('Student ID is required', 400);
  }

  const student = await prisma.student.findFirst({
    where: { id: targetStudentId, institutionId },
    include: { department: true },
  });
  if (!student) throw new AppError('Student not found', 404);

  // Available courses in their department and semester, plus any active offerings
  const courses = await prisma.course.findMany({
    where: {
      institutionId,
      OR: [
        { deptId: student.deptId, semester: student.semester || undefined },
        { deptId: null },
      ],
    },
    include: { department: true },
    orderBy: { courseCode: 'asc' },
  });

  const existingRegistrations = await prisma.courseRegistration.findMany({
    where: {
      institutionId,
      studentId: targetStudentId,
    },
  });

  return courses.map((c) => {
    const reg = existingRegistrations.find((r) => r.courseId === c.id);
    return {
      ...c,
      isRegistered: !!reg,
      registrationStatus: reg?.status || null,
      registrationId: reg?.id || null,
    };
  });
}

export async function registerCourses(data: {
  studentId: string;
  courseIds: string[];
  academicYear: string;
  semester: number;
}) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  // Student scope
  if (ctx.institutionRole === 'STUDENT') {
    const student = await prisma.student.findFirst({
      where: { userId: ctx.userId, institutionId },
    });
    if (!student || student.id !== data.studentId) {
      throw new AppError('Forbidden. Students can only register courses for themselves.', 403);
    }
  }

  const courses = await prisma.course.findMany({
    where: { id: { in: data.courseIds }, institutionId },
  });

  if (courses.length !== data.courseIds.length) {
    throw new AppError('One or more courses were not found in this institution', 404);
  }

  const totalCredits = courses.reduce((sum, c) => sum + (c.credits || 3), 0);
  const setting = await prisma.institutionSetting.findUnique({
    where: { institutionId },
  });
  const maxCredits = (setting?.gradingScaleConfig as any)?.maxCreditsPerSemester || 27;
  if (totalCredits > maxCredits) {
    throw new AppError(`Credit limit exceeded: ${totalCredits} credits requested (maximum ${maxCredits} credits allowed).`, 400);
  }

  const results = await prisma.$transaction(async (tx) => {
    const list = [];
    for (const course of courses) {
      const reg = await tx.courseRegistration.upsert({
        where: {
          institutionId_studentId_courseId_academicYear: {
            institutionId,
            studentId: data.studentId,
            courseId: course.id,
            academicYear: data.academicYear,
          },
        },
        update: {
          semester: data.semester,
          credits: course.credits || 3,
          status: 'PENDING',
        },
        create: {
          institutionId,
          studentId: data.studentId,
          courseId: course.id,
          academicYear: data.academicYear,
          semester: data.semester,
          credits: course.credits || 3,
          status: 'PENDING',
        },
      });
      list.push(reg);
    }

    await tx.auditLog.create({
      data: {
        institutionId,
        userId: ctx.userId,
        action: 'COURSES_REGISTERED',
        entityType: 'CourseRegistration',
        entityId: data.studentId,
        details: {
          studentId: data.studentId,
          coursesCount: courses.length,
          totalCredits,
          academicYear: data.academicYear,
        },
      },
    });

    return list;
  });

  return { registeredCount: results.length, totalCredits, registrations: results };
}

export async function listRegistrations(filter?: {
  status?: RegistrationStatus;
  studentId?: string;
  deptId?: string;
  semester?: number;
}) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const where: any = { institutionId };
  if (filter?.status) where.status = filter.status;
  if (filter?.studentId) where.studentId = filter.studentId;
  if (filter?.semester) where.semester = filter.semester;
  if (filter?.deptId) {
    where.student = { deptId: filter.deptId };
  }

  // If student caller, strictly enforce self
  if (ctx.institutionRole === 'STUDENT') {
    const student = await prisma.student.findFirst({
      where: { userId: ctx.userId, institutionId },
    });
    if (student) {
      where.studentId = student.id;
    }
  }

  return prisma.courseRegistration.findMany({
    where,
    include: {
      course: true,
      student: { select: { id: true, fullName: true, regNumber: true, rollNumber: true, deptId: true, semester: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function reviewRegistration(id: string, status: 'APPROVED' | 'REJECTED') {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot review registrations.', 403);
  }

  const reg = await prisma.courseRegistration.findFirst({
    where: { id, institutionId },
  });
  if (!reg) throw new AppError('Course registration not found', 404);

  return prisma.courseRegistration.update({
    where: { id },
    data: {
      status,
      approvedBy: ctx.userId,
      approvedAt: new Date(),
    },
  });
}
