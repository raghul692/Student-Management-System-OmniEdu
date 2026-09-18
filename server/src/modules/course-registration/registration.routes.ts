import { Router } from 'express';
import * as registrationController from './registration.controller';
import { authenticate, requireRoles } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();

router.use(authenticate, institutionContext);

// Available courses to register
router.get('/courses', registrationController.getAvailableCourses);

// Register courses
router.post('/', registrationController.registerCourses);

// List registrations
router.get('/', registrationController.listRegistrations);

// Review registration (HOD, Admin)
router.patch(
  '/:id/review',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD),
  registrationController.reviewRegistration
);

export default router;
