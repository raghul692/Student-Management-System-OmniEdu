import { Router } from 'express';
import * as ctrl from './webhook.controller';
import { authenticate, requireRoles } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();
router.use(authenticate, institutionContext);
router.use(requireRoles(InstitutionRole.INSTITUTION_ADMIN));

router.post('/', ctrl.registerWebhook);
router.get('/', ctrl.listWebhooks);
router.delete('/:id', ctrl.deleteWebhook);
router.get('/:id/deliveries', ctrl.listDeliveries);
router.post('/:id/test', ctrl.sendTestEvent);

export default router;
