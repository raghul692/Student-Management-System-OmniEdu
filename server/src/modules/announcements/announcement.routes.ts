import { Router } from 'express';
import * as announcementController from './announcement.controller';
import { authenticate, requireRoles } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();

router.use(authenticate, institutionContext);

// List announcements (all authenticated roles within scope)
router.get('/', announcementController.listAnnouncements);

// Create announcement (Staff / Admin)
router.post(
  '/',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY,
    InstitutionRole.CLASS_TEACHER
  ),
  announcementController.createAnnouncement
);

// Delete announcement
router.delete(
  '/:id',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD
  ),
  announcementController.deleteAnnouncement
);

export default router;
