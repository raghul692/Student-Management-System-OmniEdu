import { Router } from 'express';
import * as timetableController from './timetable.controller';
import { authenticate, requireRoles } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();

router.use(authenticate, institutionContext);

// Read timetable (available to all roles within scope)
router.get('/', timetableController.getTimetable);

// Manage timetable entries (Admin, HOD, Class Teacher)
router.post(
  '/',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.CLASS_TEACHER
  ),
  timetableController.createEntry
);

router.delete(
  '/:id',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.CLASS_TEACHER
  ),
  timetableController.deleteEntry
);

export default router;
