import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';

export interface TimetableEntryInput {
  dayOfWeek: number; // 1-6
  slotNumber: number; // 1-8
  startTime: string; // "09:00"
  endTime: string; // "09:50"
  deptId?: string;
  semester?: number;
  courseId?: string;
  classId?: string;
  subjectName: string;
  facultyName?: string;
  roomNumber?: string;
}

export async function getTimetableEntries(filter: {
  deptId?: string;
  semester?: number;
  classId?: string;
  dayOfWeek?: number;
}) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const where: any = { institutionId };
  if (filter.deptId) where.deptId = filter.deptId;
  if (filter.semester) where.semester = filter.semester;
  if (filter.classId) where.classId = filter.classId;
  if (filter.dayOfWeek) where.dayOfWeek = filter.dayOfWeek;

  // Student scope
  if (ctx.institutionRole === 'STUDENT') {
    const student = await prisma.student.findFirst({
      where: { userId: ctx.userId, institutionId },
    });
    if (student) {
      if (student.deptId) {
        where.deptId = student.deptId;
        if (student.semester) where.semester = student.semester;
      } else if (student.classId) {
        where.classId = student.classId;
      }
    }
  }

  return prisma.timetableEntry.findMany({
    where,
    include: {
      course: true,
      schoolClass: true,
    },
    orderBy: [{ dayOfWeek: 'asc' }, { slotNumber: 'asc' }],
  });
}

export async function createTimetableEntry(input: TimetableEntryInput) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot create timetable entries.', 403);
  }

  // 1. Conflict Check: Room conflict
  if (input.roomNumber) {
    const roomConflict = await prisma.timetableEntry.findFirst({
      where: {
        institutionId,
        dayOfWeek: input.dayOfWeek,
        slotNumber: input.slotNumber,
        roomNumber: input.roomNumber,
      },
    });
    if (roomConflict) {
      throw new AppError(
        `Room conflict: Room ${input.roomNumber} is already occupied by ${roomConflict.subjectName} during period ${input.slotNumber} on day ${input.dayOfWeek}.`,
        409
      );
    }
  }

  // 2. Conflict Check: Faculty conflict
  if (input.facultyName) {
    const facultyConflict = await prisma.timetableEntry.findFirst({
      where: {
        institutionId,
        dayOfWeek: input.dayOfWeek,
        slotNumber: input.slotNumber,
        facultyName: input.facultyName,
      },
    });
    if (facultyConflict) {
      throw new AppError(
        `Faculty conflict: ${input.facultyName} is already assigned to teach ${facultyConflict.subjectName} during period ${input.slotNumber} on day ${input.dayOfWeek}.`,
        409
      );
    }
  }

  // 3. Conflict Check: Class / Section conflict
  if (input.classId) {
    const classConflict = await prisma.timetableEntry.findFirst({
      where: {
        institutionId,
        dayOfWeek: input.dayOfWeek,
        slotNumber: input.slotNumber,
        classId: input.classId,
      },
    });
    if (classConflict) {
      throw new AppError(
        `Class conflict: This class already has ${classConflict.subjectName} scheduled during period ${input.slotNumber} on day ${input.dayOfWeek}.`,
        409
      );
    }
  } else if (input.deptId && input.semester) {
    const batchConflict = await prisma.timetableEntry.findFirst({
      where: {
        institutionId,
        dayOfWeek: input.dayOfWeek,
        slotNumber: input.slotNumber,
        deptId: input.deptId,
        semester: input.semester,
      },
    });
    if (batchConflict) {
      throw new AppError(
        `Batch conflict: Dept semester ${input.semester} already has ${batchConflict.subjectName} scheduled during period ${input.slotNumber} on day ${input.dayOfWeek}.`,
        409
      );
    }
  }

  const entry = await prisma.timetableEntry.create({
    data: {
      institutionId,
      dayOfWeek: input.dayOfWeek,
      slotNumber: input.slotNumber,
      startTime: input.startTime,
      endTime: input.endTime,
      deptId: input.deptId,
      semester: input.semester,
      courseId: input.courseId,
      classId: input.classId,
      subjectName: input.subjectName,
      facultyName: input.facultyName,
      roomNumber: input.roomNumber,
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
      action: 'TIMETABLE_ENTRY_CREATED',
      entityType: 'TimetableEntry',
      entityId: entry.id,
      details: {
        subjectName: input.subjectName,
        dayOfWeek: input.dayOfWeek,
        slotNumber: input.slotNumber,
        facultyName: input.facultyName,
        roomNumber: input.roomNumber,
      },
    },
  });

  return entry;
}

export async function deleteTimetableEntry(id: string) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot delete timetable entries.', 403);
  }

  const existing = await prisma.timetableEntry.findFirst({
    where: { id, institutionId },
  });
  if (!existing) throw new AppError('Timetable entry not found', 404);

  return prisma.timetableEntry.delete({
    where: { id },
  });
}
