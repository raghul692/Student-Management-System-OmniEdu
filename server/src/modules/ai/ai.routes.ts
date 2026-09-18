import { Router, Request, Response, NextFunction } from 'express';
import * as aiController from './ai.controller';
import { aiService } from '../../services/ai/ai.service';
import { authenticate, requireRoles } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import { aiLimiter } from '../../middleware/rateLimiter';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// Mandatory authentication, validated multi-tenant context, and rate limiting
router.use(authenticate, institutionContext, aiLimiter);

// Staff and faculty roles permitted for institutional AI operations
const STAFF_ROLES = ['INSTITUTION_ADMIN', 'HOD', 'FACULTY', 'CLASS_ADVISOR', 'CLASS_TEACHER'];
const ADMIN_ONLY_ROLES = ['INSTITUTION_ADMIN', 'HOD'];

// Phase F: AI Assistant & Natural Language Tool Calling
router.post('/chat', aiController.chatWithAssistant);
router.post('/tools/execute', aiController.executeTool);

// Phase F: RAG Knowledge Base Management & Semantic Querying
router.post('/knowledge/upload', requireRoles(...STAFF_ROLES), aiController.uploadKnowledgeDocument);
router.get('/knowledge/documents', aiController.listKnowledgeDocuments);
router.delete('/knowledge/documents/:id', requireRoles(...ADMIN_ONLY_ROLES), aiController.deleteKnowledgeDocument);
router.post('/knowledge/query', aiController.queryKnowledge);
router.post('/knowledge/search', aiController.queryKnowledge);
router.get('/knowledge/search', aiController.queryKnowledge);

// Phase F: Predictive Student Success & Early Warning Radar
router.post('/risk/evaluate', requireRoles(...STAFF_ROLES), aiController.evaluateStudentRisk);
router.get('/risk/early-warning', requireRoles(...STAFF_ROLES), aiController.getEarlyWarningRadar);
router.get('/risk/early-warning-radar', requireRoles(...STAFF_ROLES), aiController.getEarlyWarningRadar);

// Phase F: Personalized Learning & Study Planner (student self-ownership enforced in controller)
router.post('/learning/recommendations', aiController.getPersonalizedRecommendations);
router.get('/learning/recommendations/:studentId', aiController.getPersonalizedRecommendations);
router.post('/learning/study-plan', aiController.generateStudyPlan);

// Phase F: Exam Questions Generator & Faculty Review Workflow
router.post('/questions/generate', requireRoles(...STAFF_ROLES), aiController.generateQuestions);
router.patch('/questions/:id/review', requireRoles(...STAFF_ROLES), aiController.reviewQuestion);
router.get('/questions', requireRoles(...STAFF_ROLES), aiController.listQuestionDrafts);

// Phase F: Communications Drafter & Career Intelligence
router.post('/communications/generate', requireRoles(...STAFF_ROLES), aiController.draftCommunication);
router.post('/communications/draft', requireRoles(...STAFF_ROLES), aiController.draftCommunication);
router.post('/career/readiness', aiController.analyzeCareerReadiness);
router.post('/grading/evaluate', requireRoles(...STAFF_ROLES), aiController.evaluateGradingSubmission);

// Phase F: AI Token Consumption, Latency & Cost Analytics
router.get('/usage/analytics', requireRoles(...ADMIN_ONLY_ROLES), aiController.getUsageAnalytics);

// Backwards compatibility for Phase E summary & usage endpoints
router.post('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.body.organizationId || (req.user as any)?.organizationId;
    const { studentName, metrics } = req.body;
    if (!orgId || !studentName || !metrics) {
      throw new AppError('organizationId, studentName, and metrics are required', 400);
    }

    const result = await aiService.generateAcademicSummary({
      organizationId: orgId,
      studentName,
      metrics,
    });

    res.json({ status: 'success', data: result });
  } catch (err) { next(err); }
});

router.get('/usage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = (req.query.organizationId as string) || (req.user as any)?.organizationId;
    if (!orgId) throw new AppError('Organization context required', 400);

    const usage = aiService.getUsage(orgId);
    res.json({ status: 'success', data: usage });
  } catch (err) { next(err); }
});

export default router;
