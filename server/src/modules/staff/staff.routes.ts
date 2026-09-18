import { Router } from 'express';
import * as staffController from './staff.controller';
import { authenticate, requireRoles } from '../../middleware/authGuard';
import { institutionContext, requireActiveInstitution } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();

// All staff routes require authentication and an active institution context
router.use(authenticate, institutionContext, requireActiveInstitution);

// Staff list (Staff only — Students and Parents strictly blocked)
router.get(
  '/',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY,
    InstitutionRole.CLASS_TEACHER,
    InstitutionRole.CLASS_ADVISOR
  ),
  staffController.listStaff
);

// Faculty Workload radar
router.get(
  '/workload',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY,
    InstitutionRole.CLASS_TEACHER
  ),
  staffController.handleGetWorkload
);

// Staff detail profile
router.get(
  '/:id',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY,
    InstitutionRole.CLASS_TEACHER,
    InstitutionRole.CLASS_ADVISOR
  ),
  staffController.getStaffById
);

// Staff lifecycle status update
router.patch(
  '/:id/status',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD),
  staffController.handleUpdateStaffStatus
);

// Staff leaves
router.post(
  '/:id/leaves',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD, InstitutionRole.FACULTY),
  staffController.handleRecordStaffLeave
);
router.get(
  '/:id/leaves',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD, InstitutionRole.FACULTY),
  staffController.handleGetStaffLeaves
);
router.patch(
  '/leaves/:id/status',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD),
  staffController.handleReviewStaffLeave
);

// Create / Invite staff member
router.post(
  '/',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD
  ),
  staffController.createStaff
);

// Update staff member
router.patch(
  '/:id',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD
  ),
  staffController.updateStaff
);

// Toggle active status
router.patch(
  '/:id/toggle-active',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN),
  staffController.toggleStaffActive
);
router.patch(
  '/:id/toggle-status',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN),
  staffController.toggleStaffActive
);

export default router;
