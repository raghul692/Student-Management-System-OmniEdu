import { Router } from 'express';
import * as analyticsController from './analytics.controller';
import { authenticate, requireRoles } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();

router.use(authenticate, institutionContext);

// At-risk students intelligence radar (Admin, HOD, Faculty, Class Teacher)
router.get(
  '/at-risk',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY,
    InstitutionRole.CLASS_TEACHER
  ),
  analyticsController.getAtRiskStudents
);

// Executive overview dashboard metrics
router.get(
  '/overview',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY,
    InstitutionRole.CLASS_TEACHER
  ),
  analyticsController.getExecutiveOverview
);

// Attendance timeline & trends
router.get(
  '/attendance/trends',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY,
    InstitutionRole.CLASS_TEACHER
  ),
  analyticsController.getAttendanceTrends
);

// Fee collection trends over time
router.get(
  '/fees/trends',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD
  ),
  analyticsController.getFeeTrends
);

// Department academic comparison
router.get(
  '/academic/department',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY
  ),
  analyticsController.getDepartmentComparison
);

// Cohort progression analysis
router.get(
  '/academic/cohort',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN,
    InstitutionRole.HOD,
    InstitutionRole.FACULTY
  ),
  analyticsController.getCohortAnalysis
);

// AI platform usage, cost and token telemetry (Admin only)
router.get(
  '/ai/usage',
  requireRoles(
    InstitutionRole.INSTITUTION_ADMIN
  ),
  analyticsController.getAiUsageAnalytics
);

export default router;
