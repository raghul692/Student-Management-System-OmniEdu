import { Router } from 'express';
import * as ctrl from './intervention.controller';
import { authenticate, requireRoles } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();
router.use(authenticate, institutionContext);

const staffRoles = [
  InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD,
  InstitutionRole.FACULTY, InstitutionRole.CLASS_TEACHER, InstitutionRole.CLASS_ADVISOR,
];

router.get('/', requireRoles(...staffRoles), ctrl.listInterventions);
router.post('/', requireRoles(...staffRoles), ctrl.createIntervention);
router.get('/:id', requireRoles(...staffRoles), ctrl.getIntervention);
router.patch('/:id/status', requireRoles(...staffRoles), ctrl.advanceStatus);
router.post('/:id/notes', requireRoles(...staffRoles), ctrl.addNote);
router.get('/:id/notes', requireRoles(...staffRoles), ctrl.listNotes);

export default router;
