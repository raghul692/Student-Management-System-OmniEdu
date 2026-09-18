import { Router } from 'express';
import * as academicController from './academic.controller';
import { authenticate, requireInstitutionRole } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();

// All academic routes require authentication and institution context
router.use(authenticate, institutionContext);

// Academic Years
router.get('/years', academicController.getAcademicYears);
router.post(
  '/years',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN),
  academicController.createAcademicYear
);
router.post(
  '/years/:id/set-current',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN),
  academicController.setCurrentAcademicYear
);

// Regulations
router.get('/regulations', academicController.getRegulations);
router.get('/regulations/:id', academicController.getRegulationById);
router.post(
  '/regulations',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD),
  academicController.createRegulation
);
router.patch(
  '/regulations/:id',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD),
  academicController.updateRegulation
);
router.post(
  '/regulations/:id/publish',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN),
  academicController.publishRegulation
);
router.post(
  '/regulations/:id/archive',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN),
  academicController.archiveRegulation
);

// Programs
router.get('/programs', academicController.getPrograms);
router.post(
  '/programs',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD),
  academicController.createProgram
);

// Departments
router.get('/departments', academicController.getDepartments);
router.post(
  '/departments',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN),
  academicController.createDepartment
);

// School Classes
router.get('/classes', academicController.getClasses);
router.post(
  '/classes',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN),
  academicController.createClass
);

// School Subjects
router.get('/subjects', academicController.getSchoolSubjects);
router.post(
  '/subjects',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN),
  academicController.createSchoolSubject
);

// Courses
router.get('/courses', academicController.getCourses);
router.post(
  '/courses',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD),
  academicController.createCourse
);

// Course Offerings & Faculty Assignment
router.get('/offerings', academicController.getCourseOfferings);
router.post(
  '/offerings',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD),
  academicController.createCourseOffering
);
router.patch(
  '/offerings/:id/faculty',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD),
  academicController.assignFacultyToOffering
);

// Enrollments
router.get('/enrollments', academicController.getEnrollments);
router.post(
  '/enrollments',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD),
  academicController.enrollStudent
);

// Timetable
router.get('/timetable', academicController.getTimetable);

export default router;
