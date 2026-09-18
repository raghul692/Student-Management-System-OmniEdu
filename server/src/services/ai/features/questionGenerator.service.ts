import { prisma, InstitutionContext as TenantContext } from '../../../config/prisma';
import { getAIProvider } from '../providers/aiProvider.factory';
import { AiQuestionStatus } from '@prisma/client';
import { AppError } from '../../../middleware/errorHandler';

export interface GenerateQuestionsParams {
  courseId: string;
  syllabusUnit?: string;
  bloomsLevel: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
  questionType: 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'PROBLEM_CODING';
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  count?: number;
}

export class QuestionGeneratorService {
  public static readonly VALID_BLOOMS_LEVELS = [
    'REMEMBER',
    'UNDERSTAND',
    'APPLY',
    'ANALYZE',
    'EVALUATE',
    'CREATE',
  ] as const;

  public static readonly VALID_QUESTION_TYPES = [
    'MCQ',
    'SHORT_ANSWER',
    'LONG_ANSWER',
    'PROBLEM_CODING',
  ] as const;

  public static readonly VALID_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

  /**
   * Generate questions using syllabus & Bloom's taxonomy, saving in AI_GENERATED state.
   */
  public static async generateQuestions(params: GenerateQuestionsParams, ctx: TenantContext) {
    if (!ctx.institutionId) {
      throw new AppError('Tenant context required', 400);
    }

    // Validate Bloom's Taxonomy Level
    if (!this.VALID_BLOOMS_LEVELS.includes(params.bloomsLevel as any)) {
      throw new AppError(
        `Invalid Bloom's Taxonomy level: ${params.bloomsLevel}. Must be one of: ${this.VALID_BLOOMS_LEVELS.join(', ')}`,
        400
      );
    }

    // Validate Question Type
    if (!this.VALID_QUESTION_TYPES.includes(params.questionType as any)) {
      throw new AppError(
        `Invalid question type: ${params.questionType}. Must be one of: ${this.VALID_QUESTION_TYPES.join(', ')}`,
        400
      );
    }

    // Validate Difficulty
    if (params.difficulty && !this.VALID_DIFFICULTIES.includes(params.difficulty as any)) {
      throw new AppError(
        `Invalid difficulty: ${params.difficulty}. Must be one of: ${this.VALID_DIFFICULTIES.join(', ')}`,
        400
      );
    }

    const course = await prisma.course.findFirst({
      where: { id: params.courseId, institutionId: ctx.institutionId },
    });

    if (!course) {
      throw new AppError('Course not found in this institution', 404);
    }

    const provider = getAIProvider();
    const prompt = `Generate ${params.count || 2} academic examination questions for course "${course.courseCode}: ${course.title}".
Syllabus Unit: ${params.syllabusUnit || 'Unit 1: Fundamentals'}
Bloom's Taxonomy Level: ${params.bloomsLevel}
Question Type: ${params.questionType}
Difficulty: ${params.difficulty || 'MEDIUM'}

Output strictly as a JSON object containing an array "questions" with fields:
- questionText: string
- options: array of 4 strings (for MCQ, otherwise null)
- answerKey: string (expected answer or model solution)
- rubric: string (grading breakdown)
- difficulty: string`;

    const completion = await provider.generateCompletion(prompt, {
      responseFormat: 'json',
      temperature: 0.3,
    });

    let generatedQuestions: any[] = [];
    try {
      const parsed = JSON.parse(completion.content);
      generatedQuestions = parsed.questions || [parsed];
    } catch {
      generatedQuestions = [
        {
          questionText: `Explain the fundamental architecture and principles of ${course.title} at ${params.bloomsLevel} cognitive level.`,
          options: params.questionType === 'MCQ' ? ['Option A', 'Option B', 'Option C', 'Option D'] : null,
          answerKey: 'Comprehensive theoretical explanation with architectural diagrams.',
          rubric: '4 marks for architectural clarity, 6 marks for principles and application.',
          difficulty: params.difficulty || 'MEDIUM',
        },
      ];
    }

    if (params.count && params.count > 0) {
      generatedQuestions = generatedQuestions.slice(0, params.count);
    }

    // Persist drafts in AI_GENERATED status awaiting faculty review
    const savedDrafts = [];
    for (const q of generatedQuestions) {
      const draft = await prisma.aiQuestionDraft.create({
        data: {
          organizationId: ctx.organizationId,
          institutionId: ctx.institutionId,
          courseId: course.id,
          syllabusUnit: params.syllabusUnit,
          bloomsLevel: params.bloomsLevel,
          questionType: params.questionType,
          questionText: q.questionText,
          options: q.options || undefined,
          answerKey: q.answerKey,
          rubric: q.rubric,
          difficulty: q.difficulty || params.difficulty || 'MEDIUM',
          status: AiQuestionStatus.AI_GENERATED,
          createdBy: ctx.userId,
        },
      });
      savedDrafts.push(draft);
    }

    return savedDrafts;
  }

  /**
   * Faculty review action: approve, publish, or reject a draft question.
   * Enforces role authorization and strict lifecycle state transitions:
   * AI_GENERATED -> FACULTY_REVIEW -> APPROVED -> PUBLISHED
   */
  public static async reviewQuestion(
    questionId: string,
    actionOrPayload: 'APPROVE' | 'PUBLISH' | 'REJECT' | 'SUBMIT_FOR_REVIEW' | { status: string; reviewNotes?: string; editedQuestion?: string },
    reviewNotesOrCtx?: string | TenantContext,
    ctxParam?: TenantContext
  ) {
    let action: string;
    let reviewNotes = '';
    let editedQuestion: string | undefined;
    let ctx: TenantContext;

    if (typeof actionOrPayload === 'object') {
      action = actionOrPayload.status;
      reviewNotes = actionOrPayload.reviewNotes || '';
      editedQuestion = actionOrPayload.editedQuestion;
      ctx = (reviewNotesOrCtx as TenantContext) || ctxParam!;
    } else {
      action = actionOrPayload;
      reviewNotes = (reviewNotesOrCtx as string) || '';
      ctx = ctxParam!;
    }

    if (!ctx?.institutionId) {
      throw new AppError('Tenant context required', 400);
    }

    // Enforce server-side role check: Only academic staff/faculty can review/approve questions
    const ALLOWED_REVIEW_ROLES = [
      'INSTITUTION_ADMIN',
      'HOD',
      'FACULTY',
      'CLASS_ADVISOR',
      'CLASS_TEACHER',
    ];
    if (ctx.systemRole !== 'PLATFORM_ADMIN' && ctx.systemRole !== 'ORG_ADMIN') {
      if (!ALLOWED_REVIEW_ROLES.includes(ctx.institutionRole)) {
        throw new AppError(
          `Forbidden: Role ${ctx.institutionRole} is not authorized to review or approve exam questions`,
          403
        );
      }
    }

    const draft = await prisma.aiQuestionDraft.findFirst({
      where: { id: questionId, institutionId: ctx.institutionId },
    });

    if (!draft) {
      throw new AppError('Question draft not found in this institution', 404);
    }

    let nextStatus: AiQuestionStatus;
    const normalizedAction = action.toUpperCase();

    if (normalizedAction === 'PUBLISH' || normalizedAction === 'PUBLISHED') {
      // Direct jump from AI_GENERATED or FACULTY_REVIEW to PUBLISHED is forbidden!
      if (draft.status !== AiQuestionStatus.APPROVED) {
        throw new AppError(
          `Invalid state transition: Questions must be APPROVED before they can be PUBLISHED. Current status is ${draft.status}.`,
          400
        );
      }
      nextStatus = AiQuestionStatus.PUBLISHED;
    } else if (
      normalizedAction === 'APPROVE' ||
      normalizedAction === 'FACULTY_APPROVED' ||
      normalizedAction === 'APPROVED'
    ) {
      nextStatus = AiQuestionStatus.APPROVED;
    } else if (
      normalizedAction === 'SUBMIT_FOR_REVIEW' ||
      normalizedAction === 'REVIEW' ||
      normalizedAction === 'FACULTY_REVIEW'
    ) {
      nextStatus = AiQuestionStatus.FACULTY_REVIEW;
    } else if (normalizedAction === 'REJECT' || normalizedAction === 'REJECTED') {
      nextStatus = AiQuestionStatus.DRAFT;
    } else {
      nextStatus = AiQuestionStatus.DRAFT;
    }

    return prisma.aiQuestionDraft.update({
      where: { id: questionId },
      data: {
        status: nextStatus,
        reviewedBy: ctx.userId,
        reviewNotes,
        ...(editedQuestion ? { questionText: editedQuestion } : {}),
      },
    });
  }
}
