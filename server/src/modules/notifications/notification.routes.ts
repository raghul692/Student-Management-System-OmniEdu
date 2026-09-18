import { Router } from 'express';
import * as notificationController from './notification.controller';
import { authenticate } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';

const router = Router();

router.use(authenticate, institutionContext);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

router.get('/preferences', notificationController.getPreferences);
router.patch('/preferences', notificationController.updatePreferences);

export default router;
