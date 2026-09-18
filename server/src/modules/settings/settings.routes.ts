import { Router } from 'express';
import * as settingsController from './settings.controller';
import { authenticate, requireInstitutionRole } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();

router.use(authenticate, institutionContext);

router.get('/', settingsController.getSettings);
router.patch(
  '/',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN),
  settingsController.updateSettings
);

router.get(
  '/audit-trail',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN),
  settingsController.getAuditTrail
);

export default router;
