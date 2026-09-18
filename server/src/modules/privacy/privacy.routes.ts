import { Router } from 'express';
import * as ctrl from './privacy.controller';
import { authenticate } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';

const router = Router();
router.use(authenticate, institutionContext);
router.post('/export-request', ctrl.requestDataExport);
router.get('/export-request', ctrl.getExportRequests);
router.post('/deactivate', ctrl.deactivateAccount);
export default router;
