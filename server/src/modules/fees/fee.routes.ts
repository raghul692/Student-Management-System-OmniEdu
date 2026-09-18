import { Router } from 'express';
import * as feeController from './fee.controller';
import { authenticate, requireRoles } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();

router.use(authenticate, institutionContext);

// Institution fee summary (Admin only)
router.get(
  '/summary',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN),
  feeController.getSummary
);

// Fee structures
router.get('/structures', feeController.listStructures);
router.post(
  '/structures',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN),
  feeController.createStructure
);

// Fee assignments
router.post(
  '/assign',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN),
  feeController.assignFee
);
router.post(
  '/bulk-assign',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN),
  feeController.bulkAssign
);

// Fee payments (Admin records payments)
router.post(
  '/payments',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN),
  feeController.recordPayment
);

// Student ledger (student self-view or parent linked-ward verified inside service)
router.get(
  '/students/:studentId',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD, InstitutionRole.STUDENT, InstitutionRole.PARENT),
  feeController.getStudentLedger
);
router.get(
  '/ledger/:studentId',
  requireRoles(InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD, InstitutionRole.STUDENT, InstitutionRole.PARENT),
  feeController.getStudentLedger
);

export default router;
