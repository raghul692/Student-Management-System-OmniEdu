import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';

export interface CreateAssignmentInput {
  title: string;
  description?: string;
  dueDate: string; // ISO date or YYYY-MM-DD
  courseId?: string;
  classId?: string;
  subjectName: string;
}

export async function createAssignment(input: CreateAssignmentInput) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot create assignments.', 403);
  }

  const assignment = await prisma.assignment.create({
    data: {
      institutionId,
      title: input.title,
      description: input.description,
      dueDate: new Date(input.dueDate),
      courseId: input.courseId,
      classId: input.classId,
      subjectName: input.subjectName,
      teacherUserId: ctx.userId,
    },
    include: {
      course: true,
      schoolClass: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      institutionId,
      userId: ctx.userId,
      action: 'ASSIGNMENT_CREATED',
      entityType: 'Assignment',
      entityId: assignment.id,
      details: { title: input.title, subjectName: input.subjectName, dueDate: input.dueDate },
    },
  });

  return assignment;
}

export async function listAssignments(filter?: { courseId?: string; classId?: string }) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const where: any = { institutionId };
  if (filter?.courseId) where.courseId = filter.courseId;
  if (filter?.classId) where.classId = filter.classId;

  // Student scope
  if (ctx.institutionRole === 'STUDENT') {
    const student = await prisma.student.findFirst({
      where: { userId: ctx.userId, institutionId },
    });
    if (student) {
      if (student.deptId && student.semester) {
        where.OR = [
          { course: { deptId: student.deptId, semester: student.semester } },
          { courseId: null, classId: null },
        ];
      } else if (student.classId) {
        where.classId = student.classId;
      }
    }
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      course: true,
      schoolClass: true,
      submissions: {
        select: {
          id: true,
          studentId: true,
          grade: true,
          submittedAt: true,
          evaluatedAt: true,
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  // If student, attach their specific submission status
  if (ctx.institutionRole === 'STUDENT') {
    const student = await prisma.student.findFirst({
      where: { userId: ctx.userId, institutionId },
    });
    return assignments.map((a) => {
      const mySub = student ? a.submissions.find((s) => s.studentId === student.id) : null;
      return {
        ...a,
        totalSubmissions: a.submissions.length,
        mySubmission: mySub || null,
      };
    });
  }

  return assignments.map((a) => ({
    ...a,
    totalSubmissions: a.submissions.length,
  }));
}

export async function getAssignmentDetails(id: string) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const assignment = await prisma.assignment.findFirst({
    where: { id, institutionId },
    include: {
      course: true,
      schoolClass: true,
      submissions: {
        include: {
          student: { select: { id: true, fullName: true, regNumber: true, rollNumber: true } },
        },
        orderBy: { submittedAt: 'desc' },
      },
    },
  });

  if (!assignment) throw new AppError('Assignment not found', 404);
  return assignment;
}

export async function submitAssignment(assignmentId: string, data: { submissionText?: string; fileUrl?: string }) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const student = await prisma.student.findFirst({
    where: { userId: ctx.userId, institutionId },
  });
  if (!student) {
    throw new AppError('Student record not found for this user', 404);
  }

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, institutionId },
  });
  if (!assignment) throw new AppError('Assignment not found', 404);

  if (new Date() > new Date(assignment.dueDate)) {
    throw new AppError('Assignment submission deadline has passed. Submissions are closed.', 400);
  }

  return prisma.assignmentSubmission.upsert({
    where: {
      assignmentId_studentId: {
        assignmentId,
        studentId: student.id,
      },
    },
    update: {
      submissionText: data.submissionText,
      fileUrl: data.fileUrl,
      submittedAt: new Date(),
    },
    create: {
      assignmentId,
      studentId: student.id,
      submissionText: data.submissionText,
      fileUrl: data.fileUrl,
    },
  });
}

export async function evaluateSubmission(submissionId: string, data: { grade: string; feedback?: string }) {
  const ctx = requireInstitutionContext();

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot evaluate submissions.', 403);
  }

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  });
  if (!submission || submission.assignment.institutionId !== ctx.institutionId) {
    throw new AppError('Submission not found', 404);
  }

  return prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      grade: data.grade,
      feedback: data.feedback,
      evaluatedAt: new Date(),
    },
  });
}
