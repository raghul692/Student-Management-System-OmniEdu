import { Router } from 'express';
import * as importController from './import.controller';
import { authenticate, requireInstitutionRole } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();

router.use(authenticate, institutionContext);

router.post(
  '/preview',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN),
  importController.preview
);

router.post(
  '/:jobId/commit',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN),
  importController.commit
);

router.get('/history', importController.history);
router.get('/:jobId', importController.getJob);

export default router;
