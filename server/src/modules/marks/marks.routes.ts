import { Router } from 'express';
import * as marksController from './marks.controller';
import { authenticate, requireRoleOrPermission, requireRoles } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { InstitutionRole } from '@prisma/client';

const router = Router();

// Public Hall Ticket Cryptographic Verification Endpoint (accessible without login)
router.get('/hall-tickets/verify/:token', marksController.verifyHallTicket);

router.use(authenticate, institutionContext);

// Read routes: Exams and whole-class results are staff only (Students blocked)
router.get(
  '/exams',
  requireRoleOrPermission(
    [
      InstitutionRole.INSTITUTION_ADMIN,
      InstitutionRole.HOD,
      InstitutionRole.FACULTY,
      InstitutionRole.CLASS_TEACHER,
      InstitutionRole.CLASS_ADVISOR,
    ],
    { resource: 'marks', action: 'read' }
  ),
  marksController.listExams
);

router.get(
  '/exam/:examId',
  requireRoleOrPermission(
    [
      InstitutionRole.INSTITUTION_ADMIN,
      InstitutionRole.HOD,
      InstitutionRole.FACULTY,
      InstitutionRole.CLASS_TEACHER,
      InstitutionRole.CLASS_ADVISOR,
    ],
    { resource: 'marks', action: 'read' }
  ),
  marksController.getExamResults
);

// Individual student transcript (enforces self-only verification if caller is STUDENT)
router.get('/student/:studentId', marksController.getStudentTranscript);

// Write routes (Institution Admin, HOD, Faculty, Class Teacher, Class Advisor, or custom roles with marks:write or exams:write)
router.post(
  '/exams',
  requireRoleOrPermission(
    [
      InstitutionRole.INSTITUTION_ADMIN,
      InstitutionRole.HOD,
      InstitutionRole.CLASS_TEACHER,
    ],
    { resource: 'exams', action: 'write' }
  ),
  marksController.createExam
);

router.post(
  '/exam/:examId/batch',
  requireRoleOrPermission(
    [
      InstitutionRole.INSTITUTION_ADMIN,
      InstitutionRole.HOD,
      InstitutionRole.FACULTY,
      InstitutionRole.CLASS_TEACHER,
      InstitutionRole.CLASS_ADVISOR,
    ],
    { resource: 'marks', action: 'write' }
  ),
  marksController.batchRecordMarks
);

// Exam lifecycle status update
router.patch(
  '/exam/:examId/status',
  requireRoleOrPermission(
    [InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD],
    { resource: 'exams', action: 'write' }
  ),
  marksController.updateExamStatus
);

// Exam schedules
router.post(
  '/exam/:examId/schedules',
  requireRoleOrPermission(
    [InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD],
    { resource: 'exams', action: 'write' }
  ),
  marksController.createSchedule
);
router.get('/exam/:examId/schedules', marksController.getSchedules);

// Hall tickets
router.post(
  '/exam/:examId/hall-tickets/generate',
  requireRoleOrPermission(
    [InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD],
    { resource: 'exams', action: 'write' }
  ),
  marksController.generateHallTickets
);
router.get(
  '/exam/:examId/hall-tickets',
  requireRoleOrPermission(
    [
      InstitutionRole.INSTITUTION_ADMIN,
      InstitutionRole.HOD,
      InstitutionRole.FACULTY,
      InstitutionRole.CLASS_TEACHER,
    ],
    { resource: 'exams', action: 'read' }
  ),
  marksController.listHallTickets
);
router.get('/exam/:examId/hall-tickets/my', marksController.getMyHallTicket);

// Student report card
router.get('/student/:studentId/report-card', marksController.getReportCard);

export default router;
