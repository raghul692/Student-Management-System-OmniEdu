import { Router } from 'express';
import * as ctrl from './system.controller';
import { authenticate } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';

const router = Router();
// status is public (no auth) for uptime monitors
router.get('/status', ctrl.getSystemStatus);
// entitlements require auth
router.get('/entitlements', authenticate, institutionContext, ctrl.getEntitlementsForOrg);
export default router;
