import { Request, Response, NextFunction } from 'express';
import { aiService } from '../../services/ai/ai.service';
import { prisma, getInstitutionContext, InstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { getAIProvider } from '../../services/ai/providers/aiProvider.factory';
import { SafetyFilter } from '../../services/ai/safety/safetyFilter';

/**
 * Resolves trusted institutional tenant context.
 * Rejects unauthorized cross-tenant requests with 403 Forbidden.
 */
async function resolveContext(req: Request): Promise<InstitutionContext> {
  const asyncCtx = getInstitutionContext();
  if (asyncCtx && asyncCtx.institutionId) {
    return asyncCtx;
  }

  if (!req.user) {
    throw new AppError('Unauthorized: Authentication required', 401);
  }

  const requestedInstId =
    (req.headers['x-institution-id'] as string) ||
    req.body?.institutionId ||
    req.selectedInstitutionId ||
    (req.user as any)?.institutionId;

  if (requestedInstId) {
    if (req.user.systemRole === 'PLATFORM_ADMIN') {
      const targetInst = await prisma.institution.findUnique({
        where: { id: requestedInstId, isActive: true },
      });
      if (!targetInst) throw new AppError('Requested institution not found', 404);
      return {
        organizationId: targetInst.organizationId,
        institutionId: targetInst.id,
        userId: req.user.id,
        systemRole: req.user.systemRole,
        institutionRole: 'INSTITUTION_ADMIN' as any,
        resolvedPermissions: [],
      };
    }

    const membership = await prisma.institutionMembership.findFirst({
      where: {
        userId: req.user.id,
        institutionId: requestedInstId,
        isActive: true,
      },
      include: { institution: true },
    });

    if (!membership) {
      throw new AppError('Forbidden: Access denied to requested institution.', 403);
    }

    return {
      organizationId: membership.institution.organizationId,
      institutionId: membership.institutionId,
      userId: req.user.id,
      systemRole: req.user.systemRole,
      institutionRole: membership.role,
      resolvedPermissions: [],
    };
  }

  const defaultMembership = await prisma.institutionMembership.findFirst({
    where: { userId: req.user.id, isActive: true },
    include: { institution: true },
  });

  if (!defaultMembership) {
    throw new AppError('Tenant isolation error: No active institution membership found for user.', 403);
  }

  return {
    organizationId: defaultMembership.institution.organizationId,
    institutionId: defaultMembership.institutionId,
    userId: req.user.id,
    systemRole: req.user.systemRole,
    institutionRole: defaultMembership.role,
    resolvedPermissions: [],
  };
}

/**
 * Verify that if caller is STUDENT, they can only access their own student record.
 */
async function enforceStudentSelfAccess(studentId: string, ctx: InstitutionContext, reqUser: any) {
  if (ctx.institutionRole === 'STUDENT') {
    const myStudent = await prisma.student.findFirst({
      where: {
        institutionId: ctx.institutionId,
        OR: [
          { userId: ctx.userId },
          { email: reqUser?.email?.toLowerCase() },
        ],
      },
    });

    if (!myStudent || myStudent.id !== studentId) {
      throw new AppError('Forbidden: Students may only access their own student data.', 403);
    }
  }
}

export const chatWithAssistant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, conversationId } = req.body;
    if (!message) throw new AppError('Message content is required', 400);

    const ctx = await resolveContext(req);
    const result = await aiService.assistant.chat({
      conversationId,
      message,
      ctx,
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const executeTool = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { toolName, arguments: args } = req.body;
    if (!toolName) throw new AppError('toolName is required', 400);

    const ctx = await resolveContext(req);
    const result = await aiService.assistant.chat({
      message: `Execute tool ${toolName}`,
      ctx,
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const uploadKnowledgeDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, content, documentType, academicYear, visibility } = req.body;
    if (!title || !content) throw new AppError('Title and content are required', 400);

    const ctx = await resolveContext(req);
    const doc = await aiService.ingestion.ingestDocument({
      organizationId: ctx.organizationId,
      institutionId: ctx.institutionId,
      title,
      content,
      documentType,
      academicYear,
      visibility,
      uploadedBy: ctx.userId,
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
};

export const listKnowledgeDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await resolveContext(req);
    const documents = await prisma.aiKnowledgeDocument.findMany({
      where: { institutionId: ctx.institutionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        documentType: true,
        academicYear: true,
        visibility: true,
        totalChunks: true,
        summary: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: documents });
  } catch (err) { next(err); }
};

export const deleteKnowledgeDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ctx = await resolveContext(req);
    const doc = await prisma.aiKnowledgeDocument.findFirst({
      where: { id, institutionId: ctx.institutionId },
    });
    if (!doc) throw new AppError('Document not found in this institution', 404);

    await prisma.aiKnowledgeDocument.delete({ where: { id } });
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err) { next(err); }
};

export const queryKnowledge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.body.query || (req.query.query as string);
    if (!query) throw new AppError('Query is required', 400);

    const ctx = await resolveContext(req);
    const sources = await aiService.search.search(query, ctx.institutionId, {
      limit: 4,
    });

    const maxScore = sources.length > 0 ? Math.max(...sources.map((s) => s.similarityScore || 0)) : 0;

    // Grounding threshold: if no sources or max similarity < 0.28, do not fabricate an answer
    if (sources.length === 0 || maxScore < 0.28) {
      return res.json({
        success: true,
        data: {
          answer: 'The requested policy or academic information could not be verified with sufficient confidence in the institutional knowledge base.',
          sources: sources.filter((s) => s.similarityScore >= 0.28),
        },
      });
    }

    const provider = getAIProvider();
    const contextPrompt = `Answer the user query based ONLY on the verified institutional sources below. If the answer cannot be verified from the sources, state clearly that it is not verified. Never fabricate institutional rules.

Sources:
${sources.map((s, idx) => `[Source ${idx + 1} - "${s.documentTitle}"]\n${SafetyFilter.sanitizeDocumentContext(s.content)}`).join('\n\n')}

User Question: ${query}`;

    const completion = await provider.generateCompletion(contextPrompt, {
      temperature: 0.1,
    });

    res.json({
      success: true,
      data: {
        answer: completion.content,
        sources: sources.map((s) => ({
          documentId: s.documentId,
          title: s.documentTitle,
          type: s.documentType,
          excerpt: s.content.slice(0, 150) + '...',
          similarityScore: s.similarityScore,
        })),
      },
    });
  } catch (err) { next(err); }
};

export const evaluateStudentRisk = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.body;
    if (!studentId) throw new AppError('studentId is required', 400);

    const ctx = await resolveContext(req);
    const evaluation = await aiService.risk.evaluateStudentRisk(studentId, ctx);
    res.json({ success: true, data: evaluation });
  } catch (err) { next(err); }
};

export const getEarlyWarningRadar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await resolveContext(req);
    const radar = await aiService.earlyWarning.getEarlyWarningRadar(ctx);
    res.json({ success: true, data: radar });
  } catch (err) { next(err); }
};

export const getPersonalizedRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.studentId || req.body.studentId || (req.query.studentId as string);
    if (!studentId) throw new AppError('studentId is required', 400);

    const ctx = await resolveContext(req);
    await enforceStudentSelfAccess(studentId, ctx, req.user);

    const recs = await aiService.learning.getPersonalizedRecommendations(studentId, ctx);
    res.json({ success: true, data: recs });
  } catch (err) { next(err); }
};

export const generateStudyPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, targetExam, dailyHours, weakAreas } = req.body;
    if (!studentId || !targetExam) throw new AppError('studentId and targetExam are required', 400);

    const ctx = await resolveContext(req);
    await enforceStudentSelfAccess(studentId, ctx, req.user);

    const plan = await aiService.learning.generateStudyPlan(
      {
        studentId,
        targetExam,
        dailyHours: dailyHours || 2.5,
        weakAreas: weakAreas || ['Core Subjects'],
      },
      ctx
    );

    res.status(201).json({ success: true, data: plan });
  } catch (err) { next(err); }
};

export const generateQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, syllabusUnit, bloomsLevel, questionType, difficulty, count } = req.body;
    if (!courseId || !bloomsLevel || !questionType) {
      throw new AppError('courseId, bloomsLevel, and questionType are required', 400);
    }

    const ctx = await resolveContext(req);
    const drafts = await aiService.questions.generateQuestions(
      {
        courseId,
        syllabusUnit,
        bloomsLevel,
        questionType,
        difficulty,
        count,
      },
      ctx
    );

    res.status(201).json({ success: true, data: drafts });
  } catch (err) { next(err); }
};

export const reviewQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { action, reviewNotes } = req.body;
    if (!action || !['APPROVE', 'PUBLISH', 'REJECT', 'SUBMIT_FOR_REVIEW'].includes(action)) {
      throw new AppError('Valid action is required (APPROVE | PUBLISH | REJECT | SUBMIT_FOR_REVIEW)', 400);
    }

    const ctx = await resolveContext(req);
    const updated = await aiService.questions.reviewQuestion(
      id,
      action,
      reviewNotes || '',
      ctx
    );

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

export const listQuestionDrafts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await resolveContext(req);
    const drafts = await prisma.aiQuestionDraft.findMany({
      where: { institutionId: ctx.institutionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: drafts });
  } catch (err) { next(err); }
};

export const draftCommunication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, tone, contextDetails } = req.body;
    if (!type || !tone) throw new AppError('type and tone are required', 400);

    const ctx = await resolveContext(req);
    const result = await aiService.communications.draftCommunication(
      {
        type,
        tone,
        contextDetails: contextDetails || {},
      },
      ctx
    );

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const analyzeCareerReadiness = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, targetRole, resumeText } = req.body;
    if (!studentId) throw new AppError('studentId is required', 400);

    const ctx = await resolveContext(req);
    await enforceStudentSelfAccess(studentId, ctx, req.user);

    const result = await aiService.career.analyzeCareerReadiness(
      { studentId, targetRole, resumeText },
      ctx
    );

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const evaluateGradingSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId, submissionId, maxMarks, questionText, studentAnswerText, rubricCriteria } = req.body;
    if (!assignmentId || !studentAnswerText) {
      throw new AppError('assignmentId and studentAnswerText are required', 400);
    }

    const ctx = await resolveContext(req);
    const result = await aiService.grading.evaluateSubmission(
      {
        assignmentId,
        submissionId: submissionId || 'sub-gen',
        maxMarks: maxMarks || 20,
        questionText: questionText || 'Assignment Question',
        studentAnswerText,
        rubricCriteria: rubricCriteria || 'Accuracy (50%), Method (30%), Presentation (20%)',
      },
      ctx
    );

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getUsageAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await resolveContext(req);
    const orgId = (req.query.organizationId as string) || ctx.organizationId;
    if (!orgId) throw new AppError('Organization context required', 400);

    const usage = await aiService.usageService.getUsageAnalytics(orgId);
    res.json({ success: true, data: usage });
  } catch (err) { next(err); }
};
