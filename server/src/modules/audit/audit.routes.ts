import { Router } from 'express';
import * as ctrl from './audit.controller';
import { authenticate } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';

const router = Router();
router.use(authenticate, institutionContext);
router.get('/', ctrl.searchAuditLogs);
router.get('/export', ctrl.exportAuditLogs);
export default router;
