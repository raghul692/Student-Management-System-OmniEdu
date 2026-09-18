import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { evaluateCourseGrade } from '../../utils/cgpaCalculator';
import { evaluateSchoolSubject } from '../../utils/gradeCalculator';
import { ExamType, ExamStatus, InstitutionType } from '@prisma/client';
import { getStudentForUser } from '../students/student.service';
import crypto from 'crypto';

const HALL_TICKET_SECRET =
  process.env.HALL_TICKET_SECRET || process.env.JWT_ACCESS_SECRET || 'omniedu_hall_ticket_hmac_secret_2026';

export function generateHallTicketToken(data: {
  institutionId: string;
  examId: string;
  studentId: string;
  ticketNumber: string;
}): string {
  const payload = Buffer.from(
    JSON.stringify({
      inst: data.institutionId,
      exam: data.examId,
      stu: data.studentId,
      num: data.ticketNumber,
      ts: Date.now(),
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', HALL_TICKET_SECRET)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

export function verifyHallTicketToken(token: string): {
  institutionId: string;
  examId: string;
  studentId: string;
  ticketNumber: string;
} {
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new AppError('Invalid hall ticket verification token format', 400);
  }
  const [payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', HALL_TICKET_SECRET)
    .update(payload)
    .digest('base64url');

  const expectedBuffer = Buffer.from(expectedSig);
  const actualBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    throw new AppError('Invalid or tampered hall ticket verification token', 400);
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.inst || !data.exam || !data.stu || !data.num) {
      throw new AppError('Incomplete hall ticket verification token claims', 400);
    }
    return {
      institutionId: data.inst,
      examId: data.exam,
      studentId: data.stu,
      ticketNumber: data.num,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError('Malformed hall ticket verification token payload', 400);
  }
}

export async function listExams() {
  const ctx = requireInstitutionContext();
  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot list institution exams.', 403);
  }

  return prisma.exam.findMany({
    where: { institutionId: ctx.institutionId },
    include: { _count: { select: { marks: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createExam(data: {
  title: string;
  type: ExamType;
  academicYear: string;
  semester?: number;
  standard?: number;
  startDate?: string;
}) {
  const ctx = requireInstitutionContext();
  return prisma.exam.create({
    data: {
      institutionId: ctx.institutionId,
      title: data.title,
      type: data.type,
      academicYear: data.academicYear,
      semester: data.semester,
      standard: data.standard,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
    },
  });
}

export interface MarkEntryInput {
  studentId: string;
  courseId?: string;
  subjectName: string;
  internalMarks?: number;
  externalMarks?: number;
  marksObtained?: number;
  maxMarks?: number;
}

export async function batchRecordMarks(examId: string, entries: MarkEntryInput[]) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  // 1. Scoping validation for FACULTY
  if (ctx.institutionRole === 'FACULTY') {
    const courseIds = entries.map((e) => e.courseId).filter(Boolean) as string[];
    if (courseIds.length > 0) {
      const courses = await prisma.course.findMany({
        where: { id: { in: courseIds }, institutionId },
      });
      for (const course of courses) {
        if (ctx.deptId && course.deptId && course.deptId !== ctx.deptId) {
          throw new AppError('Forbidden. Faculty cannot submit marks for courses outside their department.', 403);
        }
      }
    }

    const studentIds = entries.map((e) => e.studentId);
    const validCount = await prisma.student.count({
      where: {
        id: { in: studentIds },
        institutionId,
        isActive: true,
        ...(ctx.deptId ? { deptId: ctx.deptId } : {}),
      },
    });
    if (validCount !== studentIds.length) {
      throw new AppError('Forbidden. Faculty cannot submit marks for students outside their department.', 403);
    }
  }

  // 2. Scoping validation for CLASS_TEACHER
  if (ctx.institutionRole === 'CLASS_TEACHER' && ctx.classId) {
    const studentIds = entries.map((e) => e.studentId);
    const validCount = await prisma.student.count({
      where: {
        id: { in: studentIds },
        institutionId,
        isActive: true,
        classId: ctx.classId,
      },
    });
    if (validCount !== studentIds.length) {
      throw new AppError('Forbidden. Class teacher cannot submit marks for students outside their assigned class.', 403);
    }
  }

  // 3. Scoping validation for HOD
  if (ctx.institutionRole === 'HOD' && ctx.deptId) {
    const studentIds = entries.map((e) => e.studentId);
    const validCount = await prisma.student.count({
      where: {
        id: { in: studentIds },
        institutionId,
        isActive: true,
        deptId: ctx.deptId,
      },
    });
    if (validCount !== studentIds.length) {
      throw new AppError('Forbidden. HOD cannot submit marks for students outside their department.', 403);
    }
  }

  const [exam, institution] = await Promise.all([
    prisma.exam.findFirst({ where: { id: examId, institutionId } }),
    prisma.institution.findUnique({ where: { id: institutionId }, select: { type: true } }),
  ]);

  if (!exam) throw new AppError('Exam not found in this institution', 404);

  if (exam.status !== ExamStatus.MARKS_ENTRY && exam.status !== ExamStatus.ONGOING) {
    throw new AppError(
      `Marks entry is not permitted for exam in status '${exam.status}'. Exam must be in ONGOING or MARKS_ENTRY stage.`,
      400
    );
  }

  const isCollege = institution?.type === InstitutionType.COLLEGE;

  const transactions = entries.map((entry) => {
    let finalGrade = 'B';
    let gradePoints: number | undefined = 6.0;
    let isPassed = true;
    let marksObtained = entry.marksObtained ?? 0;
    let creditsEarned: number | undefined = 3;

    if (isCollege) {
      const evalResult = evaluateCourseGrade({
        courseCode: entry.subjectName,
        courseTitle: entry.subjectName,
        credits: 3,
        internalMarks: entry.internalMarks,
        externalMarks: entry.externalMarks,
        totalMarks: entry.marksObtained,
      });
      marksObtained = evalResult.totalMarks;
      finalGrade = evalResult.grade;
      gradePoints = evalResult.gradePoints;
      isPassed = evalResult.isPassed;
      creditsEarned = evalResult.isPassed ? 3 : 0;
    } else {
      const evalResult = evaluateSchoolSubject(entry.subjectName, marksObtained, entry.maxMarks ?? 100);
      finalGrade = evalResult.grade;
      gradePoints = evalResult.gradePoint;
      isPassed = evalResult.isPassed;
    }

    return prisma.markRecord.upsert({
      where: {
        institutionId_examId_studentId_subjectName: {
          institutionId,
          examId,
          studentId: entry.studentId,
          subjectName: entry.subjectName,
        },
      },
      update: { internalMarks: entry.internalMarks, externalMarks: entry.externalMarks, marksObtained, maxMarks: entry.maxMarks ?? 100, grade: finalGrade, gradePoints, creditsEarned, isPassed },
      create: { institutionId, examId, studentId: entry.studentId, courseId: entry.courseId, subjectName: entry.subjectName, internalMarks: entry.internalMarks, externalMarks: entry.externalMarks, marksObtained, maxMarks: entry.maxMarks ?? 100, grade: finalGrade, gradePoints, creditsEarned, isPassed },
    });
  });

  const savedRecords = await prisma.$transaction(transactions);
  return { examId, savedCount: savedRecords.length };
}

export async function getExamResults(examId: string) {
  const ctx = requireInstitutionContext();
  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot view whole-institution exam results.', 403);
  }

  const exam = await prisma.exam.findFirst({
    where: { id: examId, institutionId: ctx.institutionId },
    include: {
      marks: {
        where: ctx.institutionRole === 'HOD' && ctx.deptId
          ? { student: { deptId: ctx.deptId } }
          : undefined,
        include: {
          student: { select: { id: true, fullName: true, regNumber: true, rollNumber: true, deptId: true } },
          course: true,
        },
      },
    },
  });

  if (!exam) throw new AppError('Exam not found', 404);

  const totalMarksCount = exam.marks.length;
  const passedCount = exam.marks.filter((m) => m.isPassed).length;

  return {
    exam: { id: exam.id, title: exam.title, type: exam.type, academicYear: exam.academicYear, semester: exam.semester, standard: exam.standard },
    analytics: { totalMarksRecorded: totalMarksCount, passedCount, passPercentage: totalMarksCount > 0 ? Number(((passedCount / totalMarksCount) * 100).toFixed(1)) : 0 },
    marks: exam.marks,
  };
}

export async function getStudentTranscript(studentId: string) {
  const ctx = requireInstitutionContext();

  // If caller is STUDENT, verify they can only view their own transcript
  if (ctx.institutionRole === 'STUDENT') {
    const myStudent = await getStudentForUser(ctx.userId, ctx.institutionId);
    if (!myStudent || myStudent.id !== studentId) {
      throw new AppError('Forbidden. Students may only access their own transcript.', 403);
    }
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId: ctx.institutionId },
    include: {
      department: true,
      schoolClass: true,
      marks: { include: { exam: true, course: true }, orderBy: { createdAt: 'desc' } },
    },
  });

  if (!student) throw new AppError('Student not found', 404);

  // Scope check for HOD
  if (ctx.institutionRole === 'HOD' && ctx.deptId && student.deptId && student.deptId !== ctx.deptId) {
    throw new AppError('Forbidden. HOD can only access marks within their department.', 403);
  }

  // Scope check for Class Teacher
  if (ctx.institutionRole === 'CLASS_TEACHER' && ctx.classId && student.classId && student.classId !== ctx.classId) {
    throw new AppError('Forbidden. Class teacher can only access marks for their assigned class.', 403);
  }

  let totalCredits = 0;
  let totalGradePoints = 0;
  for (const m of student.marks) {
    if (m.creditsEarned && m.gradePoints) {
      totalCredits += m.creditsEarned;
      totalGradePoints += m.creditsEarned * m.gradePoints;
    }
  }

  const cgpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0.0;

  return {
    student: {
      id: student.id,
      fullName: student.fullName,
      regNumber: student.regNumber,
      rollNumber: student.rollNumber,
      deptOrClass: student.department?.name || `${student.schoolClass?.standard}th - ${student.schoolClass?.section}`,
    },
    cgpa,
    records: student.marks,
  };
}

const VALID_EXAM_TRANSITIONS: Record<ExamStatus, ExamStatus[]> = {
  DRAFT: [ExamStatus.SCHEDULED],
  SCHEDULED: [ExamStatus.ONGOING, ExamStatus.DRAFT],
  ONGOING: [ExamStatus.MARKS_ENTRY],
  MARKS_ENTRY: [ExamStatus.VERIFICATION],
  VERIFICATION: [ExamStatus.PUBLISHED, ExamStatus.MARKS_ENTRY],
  PUBLISHED: [ExamStatus.ARCHIVED],
  ARCHIVED: [],
};

export async function updateExamStatus(examId: string, status: ExamStatus) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot modify exam status.', 403);
  }

  const exam = await prisma.exam.findFirst({
    where: { id: examId, institutionId },
  });
  if (!exam) throw new AppError('Exam not found', 404);

  if (exam.status === ExamStatus.ARCHIVED) {
    throw new AppError('Cannot modify an archived exam.', 400);
  }

  if (status !== exam.status) {
    const allowed = VALID_EXAM_TRANSITIONS[exam.status] || [];
    if (!allowed.includes(status)) {
      throw new AppError(
        `Invalid exam status transition from '${exam.status}' to '${status}'. Allowed transitions: ${allowed.join(', ') || 'none'}.`,
        400
      );
    }
  }

  const updated = await prisma.exam.update({
    where: { id: examId },
    data: {
      status,
      publishedAt: status === 'PUBLISHED' ? new Date() : exam.publishedAt,
    },
  });

  await prisma.auditLog.create({
    data: {
      institutionId,
      userId: ctx.userId,
      action: 'EXAM_STATUS_UPDATED',
      entityType: 'Exam',
      entityId: examId,
      details: { fromStatus: exam.status, toStatus: status },
    },
  });

  return updated;
}

export interface ExamScheduleInput {
  courseId?: string;
  subjectName: string;
  examDate: string; // YYYY-MM-DD
  startTime: string; // "10:00"
  endTime: string; // "13:00"
  roomNumber?: string;
  invigilatorName?: string;
}

export async function createExamSchedule(examId: string, data: ExamScheduleInput) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const exam = await prisma.exam.findFirst({
    where: { id: examId, institutionId },
  });
  if (!exam) throw new AppError('Exam not found', 404);

  return prisma.examSchedule.create({
    data: {
      examId,
      courseId: data.courseId,
      subjectName: data.subjectName,
      examDate: new Date(data.examDate),
      startTime: data.startTime,
      endTime: data.endTime,
      roomNumber: data.roomNumber,
      invigilatorName: data.invigilatorName,
    },
    include: { course: true },
  });
}

export async function getExamSchedules(examId: string) {
  const ctx = requireInstitutionContext();
  const exam = await prisma.exam.findFirst({
    where: { id: examId, institutionId: ctx.institutionId },
  });
  if (!exam) throw new AppError('Exam not found', 404);

  return prisma.examSchedule.findMany({
    where: { examId },
    include: { course: true },
    orderBy: { examDate: 'asc' },
  });
}

export async function generateHallTickets(examId: string) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot generate hall tickets.', 403);
  }

  const exam = await prisma.exam.findFirst({
    where: { id: examId, institutionId },
  });
  if (!exam) throw new AppError('Exam not found', 404);

  const setting = await prisma.institutionSetting.findUnique({
    where: { institutionId },
  });
  const threshold = setting?.attendanceThreshold ? Number(setting.attendanceThreshold) : 75.0;

  // Find candidate students
  const studentWhere: any = {
    institutionId,
    isActive: true,
  };
  if (exam.semester) {
    studentWhere.semester = exam.semester;
  }
  if (exam.standard) {
    studentWhere.schoolClass = { standard: exam.standard };
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      attendances: true,
      feeAssignments: {
        include: { payments: true },
      },
    },
  });

  const yearClean = (exam.academicYear || '2026').replace(/[^0-9]/g, '');
  let eligibleCount = 0;
  let ineligibleCount = 0;

  const ticketOperations: any[] = [];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];

    // Attendance check
    const totalAtt = s.attendances.length;
    const presentAtt = s.attendances.filter((a) => a.status === 'PRESENT' || a.status === 'ON_DUTY').length;
    const attPercent = totalAtt > 0 ? (presentAtt / totalAtt) * 100 : 100; // default 100 if no sessions marked yet

    let isEligible = true;
    let ineligibilityReason: string | null = null;

    if (attPercent < threshold) {
      isEligible = false;
      ineligibilityReason = `Attendance ${attPercent.toFixed(1)}% is below threshold ${threshold}%`;
    }

    // Fee clearance check
    const pendingFees = s.feeAssignments.some((fa) => {
      const paid = fa.payments.reduce((sum, p) => sum + p.amountPaid, 0);
      const isOverdue = fa.dueDate && new Date(fa.dueDate) < new Date();
      return isOverdue && paid < fa.netPayable;
    });

    if (pendingFees && isEligible) {
      isEligible = false;
      ineligibilityReason = 'Outstanding overdue fee payment required';
    }

    if (isEligible) eligibleCount++;
    else ineligibleCount++;

    const ticketNumber = `HT-${yearClean}-${s.regNumber || s.rollNumber || s.id.slice(0, 6).toUpperCase()}`;
    const roomNumber = `Hall-${Math.floor(i / 30) + 101}`;
    const seatNumber = `S-${(i % 30) + 1}`;

    const verificationToken = generateHallTicketToken({
      institutionId,
      examId,
      studentId: s.id,
      ticketNumber,
    });

    const qrCodeData = JSON.stringify({
      ticketNumber,
      verificationToken,
      verifyUrl: `/api/exams/hall-tickets/verify/${verificationToken}`,
      isEligible,
      examTitle: exam.title,
      studentName: s.fullName,
    });

    ticketOperations.push({
      studentId: s.id,
      ticketNumber,
      roomNumber,
      seatNumber,
      isEligible,
      ineligibilityReason,
      qrCodeData,
    });
  }

  const tickets = await prisma.$transaction(async (tx) => {
    const createdTickets = [];
    for (const op of ticketOperations) {
      const ticket = await tx.hallTicket.upsert({
        where: {
          institutionId_examId_studentId: {
            institutionId,
            examId,
            studentId: op.studentId,
          },
        },
        update: {
          ticketNumber: op.ticketNumber,
          roomNumber: op.roomNumber,
          seatNumber: op.seatNumber,
          isEligible: op.isEligible,
          ineligibilityReason: op.ineligibilityReason,
          qrCodeData: op.qrCodeData,
        },
        create: {
          institutionId,
          examId,
          studentId: op.studentId,
          ticketNumber: op.ticketNumber,
          roomNumber: op.roomNumber,
          seatNumber: op.seatNumber,
          isEligible: op.isEligible,
          ineligibilityReason: op.ineligibilityReason,
          qrCodeData: op.qrCodeData,
        },
      });
      createdTickets.push(ticket);
    }
    return createdTickets;
  });

  return {
    examId,
    totalProcessed: students.length,
    eligibleCount,
    ineligibleCount,
    tickets,
  };
}

export async function verifyPublicHallTicket(token: string) {
  const verified = verifyHallTicketToken(token);

  const ticket = await prisma.hallTicket.findFirst({
    where: {
      institutionId: verified.institutionId,
      examId: verified.examId,
      studentId: verified.studentId,
      ticketNumber: verified.ticketNumber,
    },
    include: {
      exam: {
        select: {
          id: true,
          title: true,
          status: true,
          type: true,
          academicYear: true,
          semester: true,
          startDate: true,
        },
      },
      student: {
        select: {
          id: true,
          fullName: true,
          regNumber: true,
          rollNumber: true,
          photoUrl: true,
          department: { select: { name: true, code: true } },
          schoolClass: { select: { standard: true, section: true } },
        },
      },
      institution: {
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          affiliatedUniversity: true,
          board: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new AppError('Hall ticket not found or no longer active in institution records', 404);
  }

  return {
    verified: true,
    ticketNumber: ticket.ticketNumber,
    isEligible: ticket.isEligible,
    ineligibilityReason: ticket.ineligibilityReason,
    student: {
      fullName: ticket.student.fullName,
      identifier: ticket.student.regNumber || ticket.student.rollNumber || 'N/A',
      deptOrClass: ticket.student.department
        ? `${ticket.student.department.code} - ${ticket.student.department.name}`
        : ticket.student.schoolClass
        ? `Class ${ticket.student.schoolClass.standard}-${ticket.student.schoolClass.section}`
        : 'N/A',
    },
    exam: {
      title: ticket.exam.title,
      type: ticket.exam.type,
      academicYear: ticket.exam.academicYear,
      semester: ticket.exam.semester,
    },
    institution: {
      name: ticket.institution.name,
      code: ticket.institution.code,
      type: ticket.institution.type,
    },
    seating: {
      roomNumber: ticket.roomNumber,
      seatNumber: ticket.seatNumber,
    },
    issuedAt: ticket.generatedAt,
  };
}

export async function listHallTickets(examId: string) {
  const ctx = requireInstitutionContext();
  return prisma.hallTicket.findMany({
    where: { examId, institutionId: ctx.institutionId },
    include: {
      student: { select: { id: true, fullName: true, regNumber: true, rollNumber: true, deptId: true, classId: true } },
    },
    orderBy: { seatNumber: 'asc' },
  });
}

export async function getMyHallTicket(examId: string) {
  const ctx = requireInstitutionContext();
  const myStudent = await getStudentForUser(ctx.userId, ctx.institutionId);
  if (!myStudent) {
    throw new AppError('Student profile not found for this user', 404);
  }

  const ticket = await prisma.hallTicket.findFirst({
    where: { examId, studentId: myStudent.id, institutionId: ctx.institutionId },
    include: {
      exam: {
        include: { schedules: true },
      },
      student: { select: { id: true, fullName: true, regNumber: true, rollNumber: true } },
    },
  });

  if (!ticket) {
    throw new AppError('Hall ticket not generated yet for this exam', 404);
  }

  return ticket;
}

export async function getStudentReportCard(studentId: string, examId?: string) {
  const ctx = requireInstitutionContext();

  if (ctx.institutionRole === 'STUDENT') {
    const myStudent = await getStudentForUser(ctx.userId, ctx.institutionId);
    if (!myStudent || myStudent.id !== studentId) {
      throw new AppError('Forbidden. Students may only access their own report card.', 403);
    }
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId: ctx.institutionId },
    include: {
      department: true,
      schoolClass: true,
      institution: { select: { name: true, code: true, type: true } },
      marks: {
        where: examId ? { examId } : undefined,
        include: { exam: true, course: true },
      },
      attendances: true,
    },
  });

  if (!student) throw new AppError('Student not found', 404);

  const totalSessions = student.attendances.length;
  const attendedSessions = student.attendances.filter((a) => a.status === 'PRESENT' || a.status === 'ON_DUTY').length;
  const attendancePercentage = totalSessions > 0 ? Number(((attendedSessions / totalSessions) * 100).toFixed(1)) : 100;

  const totalMarks = student.marks.reduce((sum, m) => sum + (m.marksObtained || 0), 0);
  const maxMarks = student.marks.reduce((sum, m) => sum + (m.maxMarks || 100), 0);
  const percentage = maxMarks > 0 ? Number(((totalMarks / maxMarks) * 100).toFixed(2)) : 0;
  const allPassed = student.marks.length > 0 && student.marks.every((m) => m.isPassed);

  return {
    student: {
      id: student.id,
      fullName: student.fullName,
      regNumber: student.regNumber,
      rollNumber: student.rollNumber,
      gender: student.gender,
      batchYear: student.batchYear,
      deptOrClass: student.department?.name || `${student.schoolClass?.standard}th - ${student.schoolClass?.section}`,
    },
    institution: student.institution,
    summary: {
      totalSubjects: student.marks.length,
      totalMarks,
      maxMarks,
      percentage,
      overallResult: allPassed ? 'PASS' : 'FAIL',
      attendancePercentage,
    },
    subjects: student.marks.map((m) => ({
      subjectName: m.subjectName,
      internalMarks: m.internalMarks,
      externalMarks: m.externalMarks,
      marksObtained: m.marksObtained,
      maxMarks: m.maxMarks,
      grade: m.grade,
      gradePoints: m.gradePoints,
      creditsEarned: m.creditsEarned,
      isPassed: m.isPassed,
      examTitle: m.exam.title,
    })),
  };
}

