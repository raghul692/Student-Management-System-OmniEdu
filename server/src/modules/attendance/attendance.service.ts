import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AttendanceStatus } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';
import { calculateAttendanceMetrics, AttendanceMetrics } from '../../utils/attendanceDefaulter';
import { checkAndTriggerAttendanceAlert } from '../notifications/notification.service';

export interface AttendanceEntryInput {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface BatchAttendanceInput {
  date: string;    // "YYYY-MM-DD"
  hour?: number;   // 1-8 (College)
  period?: number; // 1-8 (School)
  courseId?: string;
  classId?: string;
  entries: AttendanceEntryInput[];
}

export async function markBatchAttendance(input: BatchAttendanceInput) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;
  const parsedDate = new Date(input.date);

  // 1. Scoping validation for FACULTY
  if (ctx.institutionRole === 'FACULTY') {
    if (input.courseId) {
      const course = await prisma.course.findFirst({
        where: { id: input.courseId, institutionId },
      });
      if (!course) throw new AppError('Course not found in this institution', 404);
      if (ctx.deptId && course.deptId && course.deptId !== ctx.deptId) {
        throw new AppError('Forbidden. Faculty cannot record attendance for courses outside their department.', 403);
      }
    }
    const studentIds = input.entries.map((e) => e.studentId);
    const validCount = await prisma.student.count({
      where: {
        id: { in: studentIds },
        institutionId,
        isActive: true,
        ...(ctx.deptId ? { deptId: ctx.deptId } : {}),
      },
    });
    if (validCount !== studentIds.length) {
      throw new AppError('Forbidden. One or more students are not within your academic scope.', 403);
    }
  }

  // 2. Scoping validation for CLASS_TEACHER
  if (ctx.institutionRole === 'CLASS_TEACHER') {
    if (ctx.classId && input.classId && input.classId !== ctx.classId) {
      throw new AppError('Forbidden. Class teacher can only record attendance for their assigned class.', 403);
    }
    const studentIds = input.entries.map((e) => e.studentId);
    const validCount = await prisma.student.count({
      where: {
        id: { in: studentIds },
        institutionId,
        isActive: true,
        ...(ctx.classId ? { classId: ctx.classId } : {}),
      },
    });
    if (validCount !== studentIds.length) {
      throw new AppError('Forbidden. One or more students are not in your assigned class.', 403);
    }
  }

  // 3. Scoping validation for HOD
  if (ctx.institutionRole === 'HOD' && ctx.deptId) {
    if (input.courseId) {
      const course = await prisma.course.findFirst({
        where: { id: input.courseId, institutionId },
      });
      if (course && course.deptId && course.deptId !== ctx.deptId) {
        throw new AppError('Forbidden. HOD cannot record attendance for courses outside their department.', 403);
      }
    }
    const studentIds = input.entries.map((e) => e.studentId);
    const validCount = await prisma.student.count({
      where: {
        id: { in: studentIds },
        institutionId,
        isActive: true,
        deptId: ctx.deptId,
      },
    });
    if (validCount !== studentIds.length) {
      throw new AppError('Forbidden. One or more students do not belong to your department.', 403);
    }
  }

  const transactions = input.entries.map((entry) => {
    // College: hour + courseId
    if (input.hour !== undefined && input.courseId) {
      return prisma.attendance.upsert({
        where: {
          institutionId_studentId_date_hour_courseId: {
            institutionId,
            studentId: entry.studentId,
            date: parsedDate,
            hour: input.hour!,
            courseId: input.courseId!,
          },
        },
        update: { status: entry.status, remarks: entry.remarks },
        create: {
          institutionId,
          studentId: entry.studentId,
          date: parsedDate,
          hour: input.hour,
          courseId: input.courseId,
          status: entry.status,
          remarks: entry.remarks,
        },
      });
    }

    // School: period
    if (input.period !== undefined) {
      return prisma.attendance.upsert({
        where: {
          institutionId_studentId_date_period: {
            institutionId,
            studentId: entry.studentId,
            date: parsedDate,
            period: input.period!,
          },
        },
        update: { status: entry.status, remarks: entry.remarks },
        create: {
          institutionId,
          studentId: entry.studentId,
          date: parsedDate,
          period: input.period,
          status: entry.status,
          remarks: entry.remarks,
        },
      });
    }

    // Fallback
    return prisma.attendance.create({
      data: {
        institutionId,
        studentId: entry.studentId,
        date: parsedDate,
        hour: input.hour,
        period: input.period,
        courseId: input.courseId,
        status: entry.status,
        remarks: entry.remarks,
      },
    });
  });

  const results = await prisma.$transaction(transactions);

  // Trigger threshold alerts for absent entries
  const absentStudentIds = input.entries
    .filter((e) => e.status === AttendanceStatus.ABSENT)
    .map((e) => e.studentId);
  await Promise.all(
    absentStudentIds.map((sId) =>
      checkAndTriggerAttendanceAlert(sId).catch((err) =>
        console.error('Attendance alert error:', err)
      )
    )
  );

  return {
    markedCount: results.length,
    date: input.date,
    slot: input.hour ? `Hour ${input.hour}` : `Period ${input.period}`,
  };
}

export interface DefaulterStudentSummary {
  id: string;
  fullName: string;
  identifier: string;
  deptOrClass: string;
  metrics: AttendanceMetrics;
}

export async function getDefaulters(
  filter: { deptId?: string; semester?: number; classId?: string; cutoff?: number }
) {
  const ctx = requireInstitutionContext();
  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot view institution defaulters.', 403);
  }

  let cutoff = filter.cutoff;
  if (cutoff === undefined || cutoff === null) {
    const setting = await prisma.institutionSetting.findUnique({
      where: { institutionId: ctx.institutionId },
    });
    cutoff = setting?.attendanceThreshold ? Number(setting.attendanceThreshold) : 75.0;
  }

  const where: any = {
    institutionId: ctx.institutionId,
    isActive: true,
  };

  // Scope guard for HOD
  if (ctx.institutionRole === 'HOD' && ctx.deptId) {
    where.deptId = ctx.deptId;
    if (filter.deptId && filter.deptId !== ctx.deptId) {
      throw new AppError('Forbidden. HOD cannot view defaulters outside their department.', 403);
    }
  }
  if (ctx.institutionRole === 'CLASS_TEACHER' && ctx.classId) {
    where.classId = ctx.classId;
    if (filter.classId && filter.classId !== ctx.classId) {
      throw new AppError('Forbidden. Class Teacher cannot view defaulters outside their assigned class.', 403);
    }
  }

  if (filter.deptId) where.deptId = filter.deptId;
  if (filter.semester) where.semester = filter.semester;
  if (filter.classId) where.classId = filter.classId;

  const students = await prisma.student.findMany({
    where,
    include: { department: true, schoolClass: true, attendances: true },
  });

  const defaulters: DefaulterStudentSummary[] = [];

  for (const s of students) {
    const total = s.attendances.length;
    const present = s.attendances.filter((a) => a.status === 'PRESENT').length;
    const onDuty = s.attendances.filter((a) => a.status === 'ON_DUTY').length;

    const metrics = calculateAttendanceMetrics(total, present, onDuty, cutoff);

    if (metrics.percentage < cutoff && total > 0) {
      defaulters.push({
        id: s.id,
        fullName: s.fullName,
        identifier: s.regNumber || s.rollNumber || 'N/A',
        deptOrClass: s.department
          ? `${s.department.code} - Sem ${s.semester}`
          : s.schoolClass
          ? `${s.schoolClass.standard}th-${s.schoolClass.section}`
          : 'N/A',
        metrics,
      });
    }
  }

  defaulters.sort((a, b) => a.metrics.percentage - b.metrics.percentage);

  return {
    cutoff,
    totalStudentsScanned: students.length,
    defaultersCount: defaulters.length,
    detainedCount: defaulters.filter((d) => d.metrics.detained).length,
    condonationCount: defaulters.filter((d) => d.metrics.condonationEligible).length,
    defaulters,
  };
}

export interface AttendanceCorrectionInput {
  attendanceId?: string;
  studentId: string;
  requestedDate: string; // YYYY-MM-DD
  currentStatus: AttendanceStatus;
  proposedStatus: AttendanceStatus;
  reason: string;
}

export async function requestAttendanceCorrection(input: AttendanceCorrectionInput) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  // Validate student belongs to institution
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, institutionId },
  });
  if (!student) {
    throw new AppError('Student not found in this institution', 404);
  }

  // If student is requesting, verify they are requesting for themselves
  if (ctx.institutionRole === 'STUDENT') {
    const studentUser = await prisma.student.findFirst({
      where: { userId: ctx.userId, institutionId },
    });
    if (!studentUser || studentUser.id !== input.studentId) {
      throw new AppError('Forbidden. Students can only submit correction requests for themselves.', 403);
    }
  }

  // Prevent duplicate pending correction requests for the same student and record
  const existingPending = await prisma.attendanceCorrectionRequest.findFirst({
    where: {
      institutionId,
      studentId: input.studentId,
      status: 'PENDING',
      ...(input.attendanceId ? { attendanceId: input.attendanceId } : { requestedDate: new Date(input.requestedDate) }),
    },
  });
  if (existingPending) {
    throw new AppError('A pending attendance correction request already exists for this record.', 409);
  }

  return prisma.attendanceCorrectionRequest.create({
    data: {
      institutionId,
      attendanceId: input.attendanceId,
      studentId: input.studentId,
      requestedDate: new Date(input.requestedDate),
      currentStatus: input.currentStatus,
      proposedStatus: input.proposedStatus,
      reason: input.reason,
      status: 'PENDING',
      requestedBy: ctx.userId,
    },
    include: {
      student: { select: { id: true, fullName: true, regNumber: true, rollNumber: true } },
    },
  });
}

export async function listAttendanceCorrections(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const where: any = { institutionId };
  if (status) {
    where.status = status;
  }

  // If student, only show their requests
  if (ctx.institutionRole === 'STUDENT') {
    const studentUser = await prisma.student.findFirst({
      where: { userId: ctx.userId, institutionId },
    });
    if (studentUser) {
      where.studentId = studentUser.id;
    } else {
      where.requestedBy = ctx.userId;
    }
  }

  return prisma.attendanceCorrectionRequest.findMany({
    where,
    include: {
      student: { select: { id: true, fullName: true, regNumber: true, rollNumber: true, deptId: true, classId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function reviewAttendanceCorrection(
  requestId: string,
  action: 'APPROVED' | 'REJECTED',
  reviewNotes?: string
) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot review correction requests.', 403);
  }

  const reqRecord = await prisma.attendanceCorrectionRequest.findFirst({
    where: { id: requestId, institutionId },
    include: { student: true },
  });

  if (!reqRecord) {
    throw new AppError('Correction request not found', 404);
  }

  if (reqRecord.status !== 'PENDING') {
    throw new AppError(`Correction request has already been ${reqRecord.status.toLowerCase()}`, 400);
  }

  return prisma.$transaction(async (tx) => {
    // If approved and has attendance record, update the actual attendance
    if (action === 'APPROVED') {
      if (reqRecord.attendanceId) {
        await tx.attendance.update({
          where: { id: reqRecord.attendanceId },
          data: { status: reqRecord.proposedStatus },
        });
      } else {
        // Find attendance record by student and date
        const existingAtt = await tx.attendance.findFirst({
          where: {
            institutionId,
            studentId: reqRecord.studentId,
            date: reqRecord.requestedDate,
          },
        });
        if (existingAtt) {
          await tx.attendance.update({
            where: { id: existingAtt.id },
            data: { status: reqRecord.proposedStatus },
          });
        }
      }
    }

    const updated = await tx.attendanceCorrectionRequest.update({
      where: { id: requestId },
      data: {
        status: action,
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        institutionId,
        userId: ctx.userId,
        action: `ATTENDANCE_CORRECTION_${action}`,
        entityType: 'AttendanceCorrectionRequest',
        entityId: requestId,
        details: {
          studentId: reqRecord.studentId,
          requestedDate: reqRecord.requestedDate,
          fromStatus: reqRecord.currentStatus,
          toStatus: reqRecord.proposedStatus,
          reviewNotes,
        },
      },
    });

    return updated;
  });
}

export async function getAttendanceSummary() {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const [totalRecords, presentRecords, onDutyRecords, absentRecords] = await Promise.all([
    prisma.attendance.count({ where: { institutionId } }),
    prisma.attendance.count({ where: { institutionId, status: 'PRESENT' } }),
    prisma.attendance.count({ where: { institutionId, status: 'ON_DUTY' } }),
    prisma.attendance.count({ where: { institutionId, status: 'ABSENT' } }),
  ]);

  const effectivePresent = presentRecords + onDutyRecords;
  const overallPercentage = totalRecords > 0
    ? Number(((effectivePresent / totalRecords) * 100).toFixed(2))
    : 0;

  return { totalRecords, presentRecords, onDutyRecords, absentRecords, overallPercentage };
}
