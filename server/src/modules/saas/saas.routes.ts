import { Router } from 'express';
import {
  getSubscriptionController,
  upgradePlanController,
  getFeatureFlagsController,
  updateFeatureFlagController,
} from './saas.controller';
import { authenticate, requireSystemRole } from '../../middleware/authGuard';
import { SystemRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/subscription', getSubscriptionController);
router.post('/subscription/upgrade', requireSystemRole(SystemRole.PLATFORM_ADMIN, SystemRole.ORG_ADMIN), upgradePlanController);

router.get('/features', getFeatureFlagsController);
router.patch('/features/:key', requireSystemRole(SystemRole.PLATFORM_ADMIN, SystemRole.ORG_ADMIN), updateFeatureFlagController);

export default router;
