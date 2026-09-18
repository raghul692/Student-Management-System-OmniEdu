import { Router } from 'express';
import { authenticate, requireRoleOrPermission } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';
import * as roleController from './role.controller';

const router = Router();

router.use(authenticate);
router.use(institutionContext);

const requireSettingsRead = requireRoleOrPermission(
  [InstitutionRole.INSTITUTION_ADMIN],
  { resource: 'settings', action: 'read' }
);
const requireSettingsWrite = requireRoleOrPermission(
  [InstitutionRole.INSTITUTION_ADMIN],
  { resource: 'settings', action: 'write' }
);

router.get('/', requireSettingsRead, roleController.handleListRoles);
router.post('/', requireSettingsWrite, roleController.handleCreateRole);

router.get('/roles', requireSettingsRead, roleController.handleListRoles);
router.get('/roles/:id', requireSettingsRead, roleController.handleGetRole);
router.post('/roles', requireSettingsWrite, roleController.handleCreateRole);
router.put('/roles/:id', requireSettingsWrite, roleController.handleUpdateRole);
router.post('/roles/:id/duplicate', requireSettingsWrite, roleController.handleDuplicateRole);
router.patch('/roles/:id/toggle', requireSettingsWrite, roleController.handleToggleRole);

router.get('/permissions', requireSettingsRead, roleController.handleListPermissions);
router.get('/:id', requireSettingsRead, roleController.handleGetRole);
router.put('/:id', requireSettingsWrite, roleController.handleUpdateRole);
router.post('/:id/duplicate', requireSettingsWrite, roleController.handleDuplicateRole);
router.patch('/:id/toggle', requireSettingsWrite, roleController.handleToggleRole);

export default router;
