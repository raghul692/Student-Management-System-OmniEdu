import { Request, Response, NextFunction } from 'express';
import * as academicService from './academic.service';

// ── Academic Years ────────────────────────────────────────────────────────────
export async function getAcademicYears(_req: Request, res: Response, next: NextFunction) {
  try {
    const academicYears = await academicService.getAcademicYears();
    return res.status(200).json({ status: 'success', data: { academicYears } });
  } catch (err) {
    next(err);
  }
}

export async function createAcademicYear(req: Request, res: Response, next: NextFunction) {
  try {
    const { label, startDate, endDate, isCurrent } = req.body;
    if (!label || !startDate || !endDate) {
      return res.status(400).json({ status: 'fail', message: 'label, startDate, and endDate are required.' });
    }
    const academicYear = await academicService.createAcademicYear({
      label,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isCurrent,
    });
    return res.status(201).json({ status: 'success', data: { academicYear } });
  } catch (err) {
    next(err);
  }
}

export async function setCurrentAcademicYear(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const academicYear = await academicService.setCurrentAcademicYear(id);
    return res.status(200).json({ status: 'success', data: { academicYear } });
  } catch (err) {
    next(err);
  }
}

// ── Regulations ───────────────────────────────────────────────────────────────
export async function getRegulations(_req: Request, res: Response, next: NextFunction) {
  try {
    const regulations = await academicService.getRegulations();
    return res.status(200).json({ status: 'success', data: { regulations } });
  } catch (err) {
    next(err);
  }
}

export async function getRegulationById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const regulation = await academicService.getRegulationById(id);
    if (!regulation) {
      return res.status(404).json({ status: 'fail', message: 'Regulation not found.' });
    }
    return res.status(200).json({ status: 'success', data: { regulation } });
  } catch (err) {
    next(err);
  }
}

export async function createRegulation(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, title, startYear, endYear, description } = req.body;
    if (!code || !title || !startYear) {
      return res.status(400).json({ status: 'fail', message: 'code, title, and startYear are required.' });
    }
    const regulation = await academicService.createRegulation({
      code,
      title,
      startYear: Number(startYear),
      endYear: endYear ? Number(endYear) : undefined,
      description,
    });
    return res.status(201).json({ status: 'success', data: { regulation } });
  } catch (err) {
    next(err);
  }
}

export async function updateRegulation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const regulation = await academicService.updateRegulation(id, req.body);
    return res.status(200).json({ status: 'success', data: { regulation } });
  } catch (err) {
    next(err);
  }
}

export async function publishRegulation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const regulation = await academicService.publishRegulation(id);
    return res.status(200).json({ status: 'success', data: { regulation } });
  } catch (err) {
    next(err);
  }
}

export async function archiveRegulation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const regulation = await academicService.archiveRegulation(id);
    return res.status(200).json({ status: 'success', data: { regulation } });
  } catch (err) {
    next(err);
  }
}

// ── Programs ──────────────────────────────────────────────────────────────────
export async function getPrograms(req: Request, res: Response, next: NextFunction) {
  try {
    const deptId = req.query.deptId as string | undefined;
    const programs = await academicService.getPrograms(deptId);
    return res.status(200).json({ status: 'success', data: { programs } });
  } catch (err) {
    next(err);
  }
}

export async function createProgram(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, code, deptId, durationYears, totalSemesters, regulationId, regulationYear } = req.body;
    if (!name || !code || !deptId) {
      return res.status(400).json({ status: 'fail', message: 'name, code, and deptId are required.' });
    }
    const program = await academicService.createProgram({
      name,
      code,
      deptId,
      durationYears: durationYears ? Number(durationYears) : 4,
      totalSemesters: totalSemesters ? Number(totalSemesters) : 8,
      regulationId,
      regulationYear,
    });
    return res.status(201).json({ status: 'success', data: { program } });
  } catch (err) {
    next(err);
  }
}

// ── Departments ───────────────────────────────────────────────────────────────
export async function getDepartments(_req: Request, res: Response, next: NextFunction) {
  try {
    const departments = await academicService.getDepartments();
    return res.status(200).json({ status: 'success', data: { departments } });
  } catch (err) {
    next(err);
  }
}

export async function createDepartment(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, code, hodName, hodUserId } = req.body;
    if (!name || !code) {
      return res.status(400).json({ status: 'fail', message: 'name and code are required.' });
    }
    const department = await academicService.createDepartment({ name, code, hodName, hodUserId });
    return res.status(201).json({ status: 'success', data: { department } });
  } catch (err) {
    next(err);
  }
}

// ── School Classes ────────────────────────────────────────────────────────────
export async function getClasses(_req: Request, res: Response, next: NextFunction) {
  try {
    const classes = await academicService.getClasses();
    return res.status(200).json({ status: 'success', data: { classes } });
  } catch (err) {
    next(err);
  }
}

export async function createClass(req: Request, res: Response, next: NextFunction) {
  try {
    const { standard, section, classTeacher } = req.body;
    if (standard === undefined || !section) {
      return res.status(400).json({ status: 'fail', message: 'standard and section are required.' });
    }
    const schoolClass = await academicService.createClass({
      standard: Number(standard),
      section,
      classTeacher,
    });
    return res.status(201).json({ status: 'success', data: { class: schoolClass } });
  } catch (err) {
    next(err);
  }
}

// ── School Subjects ───────────────────────────────────────────────────────────
export async function getSchoolSubjects(req: Request, res: Response, next: NextFunction) {
  try {
    const classId = req.query.classId as string | undefined;
    const subjects = await academicService.getSchoolSubjects(classId);
    return res.status(200).json({ status: 'success', data: { subjects } });
  } catch (err) {
    next(err);
  }
}

export async function createSchoolSubject(req: Request, res: Response, next: NextFunction) {
  try {
    const { classId, name, code, teacherName, teacherUserId, weeklyHours } = req.body;
    if (!classId || !name) {
      return res.status(400).json({ status: 'fail', message: 'classId and name are required.' });
    }
    const subject = await academicService.createSchoolSubject({
      classId,
      name,
      code,
      teacherName,
      teacherUserId,
      weeklyHours: weeklyHours ? Number(weeklyHours) : 4,
    });
    return res.status(201).json({ status: 'success', data: { subject } });
  } catch (err) {
    next(err);
  }
}

// ── Courses ───────────────────────────────────────────────────────────────────
export async function getCourses(req: Request, res: Response, next: NextFunction) {
  try {
    const deptId = req.query.deptId as string | undefined;
    const semester = req.query.semester ? parseInt(req.query.semester as string, 10) : undefined;
    const regulationId = req.query.regulationId as string | undefined;

    const courses = await academicService.getCourses(deptId, semester, regulationId);
    return res.status(200).json({ status: 'success', data: { courses } });
  } catch (err) {
    next(err);
  }
}

export async function createCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const { courseCode, title, semester, credits, isLab, deptId, regulationId, regulationYear } = req.body;
    if (!courseCode || !title || semester === undefined) {
      return res.status(400).json({ status: 'fail', message: 'courseCode, title, and semester are required.' });
    }
    const course = await academicService.createCourse({
      courseCode,
      title,
      semester: Number(semester),
      credits: credits ? Number(credits) : 3,
      isLab: Boolean(isLab),
      deptId,
      regulationId,
      regulationYear,
    });
    return res.status(201).json({ status: 'success', data: { course } });
  } catch (err) {
    next(err);
  }
}

// ── Course Offerings & Faculty Assignment ─────────────────────────────────────
export async function getCourseOfferings(req: Request, res: Response, next: NextFunction) {
  try {
    const academicYearId = req.query.academicYearId as string | undefined;
    const deptId = req.query.deptId as string | undefined;
    const semester = req.query.semester ? parseInt(req.query.semester as string, 10) : undefined;

    const offerings = await academicService.getCourseOfferings({ academicYearId, deptId, semester });
    return res.status(200).json({ status: 'success', data: { offerings } });
  } catch (err) {
    next(err);
  }
}

export async function createCourseOffering(req: Request, res: Response, next: NextFunction) {
  try {
    const { academicYearId, deptId, courseId, semester, section, facultyUserId, facultyName } = req.body;
    if (!academicYearId || !deptId || !courseId || semester === undefined) {
      return res.status(400).json({ status: 'fail', message: 'academicYearId, deptId, courseId, and semester are required.' });
    }
    const offering = await academicService.createCourseOffering({
      academicYearId,
      deptId,
      courseId,
      semester: Number(semester),
      section,
      facultyUserId,
      facultyName,
    });
    return res.status(201).json({ status: 'success', data: { offering } });
  } catch (err) {
    next(err);
  }
}

export async function assignFacultyToOffering(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { facultyUserId, facultyName } = req.body;
    if (!facultyUserId || !facultyName) {
      return res.status(400).json({ status: 'fail', message: 'facultyUserId and facultyName are required.' });
    }
    const offering = await academicService.assignFacultyToOffering(id, facultyUserId, facultyName);
    return res.status(200).json({ status: 'success', data: { offering } });
  } catch (err) {
    next(err);
  }
}

// ── Enrollments ───────────────────────────────────────────────────────────────
export async function getEnrollments(req: Request, res: Response, next: NextFunction) {
  try {
    const courseOfferingId = req.query.courseOfferingId as string | undefined;
    const schoolClassId = req.query.schoolClassId as string | undefined;
    const studentId = req.query.studentId as string | undefined;
    const academicYear = req.query.academicYear as string | undefined;

    const enrollments = await academicService.getEnrollments({
      courseOfferingId,
      schoolClassId,
      studentId,
      academicYear,
    });
    return res.status(200).json({ status: 'success', data: { enrollments } });
  } catch (err) {
    next(err);
  }
}

export async function enrollStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const { studentId, courseOfferingId, schoolClassId, academicYear } = req.body;
    if (!studentId || !academicYear) {
      return res.status(400).json({ status: 'fail', message: 'studentId and academicYear are required.' });
    }
    if (courseOfferingId) {
      const enrollment = await academicService.enrollStudentInOffering({
        studentId,
        courseOfferingId,
        academicYear,
      });
      return res.status(201).json({ status: 'success', data: { enrollment } });
    } else if (schoolClassId) {
      const enrollment = await academicService.enrollStudentInClass({
        studentId,
        schoolClassId,
        academicYear,
      });
      return res.status(201).json({ status: 'success', data: { enrollment } });
    } else {
      return res.status(400).json({ status: 'fail', message: 'Either courseOfferingId or schoolClassId must be specified.' });
    }
  } catch (err) {
    next(err);
  }
}

// ── Timetable ─────────────────────────────────────────────────────────────────
export async function getTimetable(req: Request, res: Response, next: NextFunction) {
  try {
    const deptId = req.query.deptId as string | undefined;
    const semester = req.query.semester ? parseInt(req.query.semester as string, 10) : undefined;
    const classId = req.query.classId as string | undefined;
    const dayOfWeek = req.query.dayOfWeek ? parseInt(req.query.dayOfWeek as string, 10) : undefined;

    const timetable = await academicService.getTimetable({
      deptId,
      semester,
      classId,
      dayOfWeek,
    });

    return res.status(200).json({
      status: 'success',
      data: { timetable },
    });
  } catch (err) {
    next(err);
  }
}
