import { Router } from 'express';
import * as studentController from './student.controller';
import { authenticate, requireRoles } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();

router.use(authenticate, institutionContext);

// Scoped self endpoint for students
router.get('/me', studentController.getMyStudentProfile);

// Read routes: Accessible only by authorized staff roles (Students blocked from directory)
router.get(
  '/',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY,
    InstitutionRole.CLASS_TEACHER,
    InstitutionRole.CLASS_ADVISOR
  ),
  studentController.listStudents
);

// Get single student by ID (enforces self-only check if caller is STUDENT)
router.get('/:id', studentController.getStudentById);

// Write routes: Restricted to HOD, Institution Admin, Class Teacher, and Class Advisor
router.post(
  '/',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.CLASS_TEACHER,
    InstitutionRole.CLASS_ADVISOR
  ),
  studentController.createStudent
);

router.post(
  '/promote',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD),
  studentController.handlePromoteStudents
);

router.patch(
  '/:id/status',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD),
  studentController.handleUpdateStudentStatus
);

router.post(
  '/:id/documents',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD, InstitutionRole.CLASS_TEACHER),
  studentController.handleAddStudentDocument
);

router.get(
  '/:id/documents',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.CLASS_TEACHER,
    InstitutionRole.CLASS_ADVISOR,
    InstitutionRole.FACULTY,
    InstitutionRole.STUDENT,
    InstitutionRole.PARENT
  ),
  studentController.handleGetStudentDocuments
);

router.put(
  '/:id',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.CLASS_TEACHER,
    InstitutionRole.CLASS_ADVISOR
  ),
  studentController.updateStudent
);

// Phase H: Student 360° aggregated profile (RBAC enforced in controller)
router.get('/:id/360', studentController.getStudent360);

router.delete(
  '/:id',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD),
  studentController.deleteStudent
);

export default router;
