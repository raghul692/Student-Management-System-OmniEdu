import { Router } from 'express';
import * as assignmentController from './assignment.controller';
import { authenticate, requireRoles } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();

router.use(authenticate, institutionContext);

// Read assignments
router.get('/', assignmentController.listAssignments);
router.get('/:id', assignmentController.getAssignment);

// Create assignment (Faculty, Class Teacher, HOD, Admin)
router.post(
  '/',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY,
    InstitutionRole.CLASS_TEACHER
  ),
  assignmentController.createAssignment
);

// Student submit assignment
router.post('/:id/submit', assignmentController.submitAssignment);

// Evaluate submission (Teacher / HOD / Admin)
router.patch(
  '/submissions/:id/evaluate',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY,
    InstitutionRole.CLASS_TEACHER
  ),
  assignmentController.evaluateSubmission
);

export default router;
