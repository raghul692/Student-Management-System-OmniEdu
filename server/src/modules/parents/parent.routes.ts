import { Router } from 'express';
import * as parentController from './parent.controller';
import { authenticate, requireInstitutionRole } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();
router.use(authenticate, institutionContext);

router.get('/children', parentController.getMyChildren);
router.get('/student/:studentId', parentController.getChildSummary);

// Phase H: Extended parent portal endpoints (all enforce parent-link IDOR protection in service)
router.get('/student/:studentId/attendance', parentController.getChildAttendance);
router.get('/student/:studentId/marks', parentController.getChildMarks);
router.get('/student/:studentId/fees', parentController.getChildFees);
router.get('/student/:studentId/assignments', parentController.getChildAssignments);
router.get('/student/:studentId/notices', parentController.getChildNotices);

router.post(
  '/link',
  requireInstitutionRole(InstitutionRole.INSTITUTION_ADMIN),
  parentController.linkChild
);

export default router;
