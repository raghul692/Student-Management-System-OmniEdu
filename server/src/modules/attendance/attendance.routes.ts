import { Router } from 'express';
import * as attendanceController from './attendance.controller';
import { authenticate, requireRoles } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();

router.use(authenticate, institutionContext);

// Defaulters radar & summary reports (Staff only — Students strictly forbidden)
router.get(
  '/defaulters',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.CLASS_TEACHER,
    InstitutionRole.CLASS_ADVISOR
  ),
  attendanceController.getDefaulters
);

router.get(
  '/summary',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY,
    InstitutionRole.CLASS_TEACHER,
    InstitutionRole.CLASS_ADVISOR
  ),
  attendanceController.getSummary
);

// Mark attendance (Faculty, Class Teacher, HOD, Institution Admin, Class Advisor)
router.post(
  '/mark',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY,
    InstitutionRole.CLASS_TEACHER,
    InstitutionRole.CLASS_ADVISOR
  ),
  attendanceController.markBatchAttendance
);

router.post(
  '/batch',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY,
    InstitutionRole.CLASS_TEACHER,
    InstitutionRole.CLASS_ADVISOR
  ),
  attendanceController.markBatchAttendance
);

// Attendance correction requests workflow
router.post('/corrections', attendanceController.requestCorrection);
router.get('/corrections', attendanceController.listCorrections);
router.patch(
  '/corrections/:id/review',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.CLASS_TEACHER,
    InstitutionRole.CLASS_ADVISOR
  ),
  attendanceController.reviewCorrection
);

export default router;
