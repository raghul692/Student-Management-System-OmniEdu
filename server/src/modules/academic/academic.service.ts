import { prisma, requireInstitutionContext } from '../../config/prisma';
import { RegulationStatus } from '@prisma/client';
import { logAuditEvent } from '../audit/audit.service';

// ── Academic Years ────────────────────────────────────────────────────────────
export async function getAcademicYears() {
  const ctx = requireInstitutionContext();
  return prisma.academicYear.findMany({
    where: { institutionId: ctx.institutionId },
    orderBy: { startDate: 'desc' },
  });
}

export async function createAcademicYear(data: { label: string; startDate: Date; endDate: Date; isCurrent?: boolean }) {
  const ctx = requireInstitutionContext();
  if (data.isCurrent) {
    await prisma.academicYear.updateMany({
      where: { institutionId: ctx.institutionId },
      data: { isCurrent: false },
    });
  }
  const year = await prisma.academicYear.create({
    data: {
      institutionId: ctx.institutionId,
      label: data.label,
      startDate: data.startDate,
      endDate: data.endDate,
      isCurrent: data.isCurrent ?? false,
    },
  });
  await logAuditEvent({
    action: 'ACADEMIC_YEAR_CREATED',
    entityType: 'AcademicYear',
    entityId: year.id,
    details: { label: year.label },
  });
  return year;
}

export async function setCurrentAcademicYear(id: string) {
  const ctx = requireInstitutionContext();
  await prisma.academicYear.updateMany({
    where: { institutionId: ctx.institutionId },
    data: { isCurrent: false },
  });
  return prisma.academicYear.update({
    where: { id },
    data: { isCurrent: true },
  });
}

// ── Regulations ───────────────────────────────────────────────────────────────
export async function getRegulations() {
  const ctx = requireInstitutionContext();
  return prisma.regulation.findMany({
    where: { institutionId: ctx.institutionId },
    include: {
      _count: { select: { programs: true, courses: true } },
    },
    orderBy: { startYear: 'desc' },
  });
}

export async function getRegulationById(id: string) {
  const ctx = requireInstitutionContext();
  return prisma.regulation.findFirst({
    where: { id, institutionId: ctx.institutionId },
    include: {
      programs: true,
      courses: {
        include: { department: { select: { id: true, name: true, code: true } } },
        orderBy: [{ semester: 'asc' }, { courseCode: 'asc' }],
      },
    },
  });
}

export async function createRegulation(data: {
  code: string;
  title: string;
  startYear: number;
  endYear?: number;
  description?: string;
}) {
  const ctx = requireInstitutionContext();
  const reg = await prisma.regulation.create({
    data: {
      institutionId: ctx.institutionId,
      code: data.code,
      title: data.title,
      startYear: data.startYear,
      endYear: data.endYear,
      description: data.description,
      status: RegulationStatus.DRAFT,
    },
  });
  await logAuditEvent({
    action: 'REGULATION_CREATED',
    entityType: 'Regulation',
    entityId: reg.id,
    details: { code: reg.code, title: reg.title },
  });
  return reg;
}

export async function updateRegulation(
  id: string,
  data: Partial<{ title: string; startYear: number; endYear?: number; description?: string }>
) {
  const ctx = requireInstitutionContext();
  return prisma.regulation.update({
    where: { id },
    data,
  });
}

export async function publishRegulation(id: string) {
  const ctx = requireInstitutionContext();
  const reg = await prisma.regulation.findFirst({
    where: { id, institutionId: ctx.institutionId },
  });
  if (!reg) throw new Error('Regulation not found.');

  const updated = await prisma.regulation.update({
    where: { id },
    data: { status: RegulationStatus.PUBLISHED },
  });

  await logAuditEvent({
    action: 'REGULATION_PUBLISHED',
    entityType: 'Regulation',
    entityId: id,
    details: { code: updated.code, version: updated.title },
  });

  return updated;
}

export async function archiveRegulation(id: string) {
  const ctx = requireInstitutionContext();
  return prisma.regulation.update({
    where: { id },
    data: { status: RegulationStatus.ARCHIVED },
  });
}

// ── Programs ──────────────────────────────────────────────────────────────────
export async function getPrograms(deptId?: string) {
  const ctx = requireInstitutionContext();
  return prisma.program.findMany({
    where: {
      institutionId: ctx.institutionId,
      ...(deptId ? { deptId } : {}),
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      regulation: { select: { id: true, code: true, title: true, status: true } },
      _count: { select: { students: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createProgram(data: {
  name: string;
  code: string;
  deptId: string;
  durationYears?: number;
  totalSemesters?: number;
  regulationId?: string;
  regulationYear?: string;
}) {
  const ctx = requireInstitutionContext();
  return prisma.program.create({
    data: {
      institutionId: ctx.institutionId,
      name: data.name,
      code: data.code,
      deptId: data.deptId,
      durationYears: data.durationYears ?? 4,
      totalSemesters: data.totalSemesters ?? 8,
      regulationId: data.regulationId,
      regulationYear: data.regulationYear,
    },
  });
}

// ── Departments ───────────────────────────────────────────────────────────────
export async function getDepartments() {
  const ctx = requireInstitutionContext();
  return prisma.department.findMany({
    where: { institutionId: ctx.institutionId },
    include: {
      _count: {
        select: { students: true, courses: true, memberships: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createDepartment(data: { name: string; code: string; hodName?: string; hodUserId?: string }) {
  const ctx = requireInstitutionContext();
  return prisma.department.create({
    data: {
      institutionId: ctx.institutionId,
      name: data.name,
      code: data.code,
      hodName: data.hodName,
      hodUserId: data.hodUserId,
    },
  });
}

// ── School Classes ────────────────────────────────────────────────────────────
export async function getClasses() {
  const ctx = requireInstitutionContext();
  return prisma.schoolClass.findMany({
    where: { institutionId: ctx.institutionId },
    include: {
      subjects: true,
      _count: {
        select: { students: true },
      },
    },
    orderBy: [{ standard: 'asc' }, { section: 'asc' }],
  });
}

export async function createClass(data: { standard: number; section: string; classTeacher?: string }) {
  const ctx = requireInstitutionContext();
  return prisma.schoolClass.create({
    data: {
      institutionId: ctx.institutionId,
      standard: data.standard,
      section: data.section,
      classTeacher: data.classTeacher,
    },
  });
}

// ── School Subjects ───────────────────────────────────────────────────────────
export async function getSchoolSubjects(classId?: string) {
  const ctx = requireInstitutionContext();
  return prisma.schoolSubject.findMany({
    where: {
      institutionId: ctx.institutionId,
      ...(classId ? { classId } : {}),
    },
    include: {
      schoolClass: { select: { id: true, standard: true, section: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createSchoolSubject(data: {
  classId: string;
  name: string;
  code?: string;
  teacherName?: string;
  teacherUserId?: string;
  weeklyHours?: number;
}) {
  const ctx = requireInstitutionContext();
  return prisma.schoolSubject.create({
    data: {
      institutionId: ctx.institutionId,
      classId: data.classId,
      name: data.name,
      code: data.code,
      teacherName: data.teacherName,
      teacherUserId: data.teacherUserId,
      weeklyHours: data.weeklyHours ?? 4,
    },
  });
}

// ── Courses ───────────────────────────────────────────────────────────────────
export async function getCourses(deptId?: string, semester?: number, regulationId?: string) {
  const ctx = requireInstitutionContext();
  return prisma.course.findMany({
    where: {
      institutionId: ctx.institutionId,
      ...(deptId ? { deptId } : {}),
      ...(semester ? { semester } : {}),
      ...(regulationId ? { regulationId } : {}),
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      regulation: { select: { id: true, code: true, title: true } },
    },
    orderBy: [{ semester: 'asc' }, { courseCode: 'asc' }],
  });
}

export async function createCourse(data: {
  courseCode: string;
  title: string;
  semester: number;
  credits?: number;
  isLab?: boolean;
  deptId?: string;
  regulationId?: string;
  regulationYear?: string;
}) {
  const ctx = requireInstitutionContext();
  return prisma.course.create({
    data: {
      institutionId: ctx.institutionId,
      courseCode: data.courseCode,
      title: data.title,
      semester: data.semester,
      credits: data.credits ?? 3,
      isLab: data.isLab ?? false,
      deptId: data.deptId,
      regulationId: data.regulationId,
      regulationYear: data.regulationYear,
    },
  });
}

// ── Course Offerings & Faculty Assignment ─────────────────────────────────────
export async function getCourseOfferings(filter?: {
  academicYearId?: string;
  deptId?: string;
  semester?: number;
}) {
  const ctx = requireInstitutionContext();
  return prisma.courseOffering.findMany({
    where: {
      institutionId: ctx.institutionId,
      ...(filter?.academicYearId ? { academicYearId: filter.academicYearId } : {}),
      ...(filter?.deptId ? { deptId: filter.deptId } : {}),
      ...(filter?.semester ? { semester: filter.semester } : {}),
    },
    include: {
      course: true,
      department: { select: { id: true, name: true, code: true } },
      academicYear: { select: { id: true, label: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: [{ semester: 'asc' }, { section: 'asc' }],
  });
}

export async function createCourseOffering(data: {
  academicYearId: string;
  deptId: string;
  courseId: string;
  semester: number;
  section?: string;
  facultyUserId?: string;
  facultyName?: string;
}) {
  const ctx = requireInstitutionContext();
  const offering = await prisma.courseOffering.create({
    data: {
      institutionId: ctx.institutionId,
      academicYearId: data.academicYearId,
      deptId: data.deptId,
      courseId: data.courseId,
      semester: data.semester,
      section: data.section || 'A',
      facultyUserId: data.facultyUserId,
      facultyName: data.facultyName,
    },
    include: {
      course: true,
      department: true,
    },
  });
  await logAuditEvent({
    action: 'COURSE_OFFERING_CREATED',
    entityType: 'CourseOffering',
    entityId: offering.id,
    details: { courseCode: offering.course.courseCode, section: offering.section, faculty: offering.facultyName },
  });
  return offering;
}

export async function assignFacultyToOffering(offeringId: string, facultyUserId: string, facultyName: string) {
  const ctx = requireInstitutionContext();
  const offering = await prisma.courseOffering.update({
    where: { id: offeringId },
    data: { facultyUserId, facultyName },
  });
  await logAuditEvent({
    action: 'FACULTY_ASSIGNED_TO_COURSE',
    entityType: 'CourseOffering',
    entityId: offeringId,
    details: { facultyUserId, facultyName },
  });
  return offering;
}

// ── Student Enrollments ───────────────────────────────────────────────────────
export async function getEnrollments(filter?: {
  courseOfferingId?: string;
  schoolClassId?: string;
  studentId?: string;
  academicYear?: string;
}) {
  const ctx = requireInstitutionContext();
  return prisma.studentEnrollment.findMany({
    where: {
      institutionId: ctx.institutionId,
      ...(filter?.courseOfferingId ? { courseOfferingId: filter.courseOfferingId } : {}),
      ...(filter?.schoolClassId ? { schoolClassId: filter.schoolClassId } : {}),
      ...(filter?.studentId ? { studentId: filter.studentId } : {}),
      ...(filter?.academicYear ? { academicYear: filter.academicYear } : {}),
    },
    include: {
      student: { select: { id: true, fullName: true, regNumber: true, rollNumber: true, email: true } },
      courseOffering: { include: { course: true } },
      schoolClass: true,
    },
  });
}

export async function enrollStudentInOffering(data: {
  studentId: string;
  courseOfferingId: string;
  academicYear: string;
}) {
  const ctx = requireInstitutionContext();
  return prisma.studentEnrollment.upsert({
    where: {
      institutionId_studentId_courseOfferingId: {
        institutionId: ctx.institutionId,
        studentId: data.studentId,
        courseOfferingId: data.courseOfferingId,
      },
    },
    update: { status: 'ACTIVE' },
    create: {
      institutionId: ctx.institutionId,
      studentId: data.studentId,
      courseOfferingId: data.courseOfferingId,
      academicYear: data.academicYear,
      status: 'ACTIVE',
    },
  });
}

export async function enrollStudentInClass(data: {
  studentId: string;
  schoolClassId: string;
  academicYear: string;
}) {
  const ctx = requireInstitutionContext();
  return prisma.studentEnrollment.upsert({
    where: {
      institutionId_studentId_schoolClassId_academicYear: {
        institutionId: ctx.institutionId,
        studentId: data.studentId,
        schoolClassId: data.schoolClassId,
        academicYear: data.academicYear,
      },
    },
    update: { status: 'ACTIVE' },
    create: {
      institutionId: ctx.institutionId,
      studentId: data.studentId,
      schoolClassId: data.schoolClassId,
      academicYear: data.academicYear,
      status: 'ACTIVE',
    },
  });
}

// ── Timetable ─────────────────────────────────────────────────────────────────
export async function getTimetable(
  filter: { deptId?: string; semester?: number; classId?: string; dayOfWeek?: number }
) {
  const ctx = requireInstitutionContext();
  return prisma.timetableEntry.findMany({
    where: {
      institutionId: ctx.institutionId,
      ...(filter.deptId ? { deptId: filter.deptId } : {}),
      ...(filter.semester ? { semester: filter.semester } : {}),
      ...(filter.classId ? { classId: filter.classId } : {}),
      ...(filter.dayOfWeek ? { dayOfWeek: filter.dayOfWeek } : {}),
    },
    include: {
      course: { select: { id: true, courseCode: true, title: true, isLab: true } },
      schoolClass: { select: { id: true, standard: true, section: true } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { slotNumber: 'asc' }],
  });
}
