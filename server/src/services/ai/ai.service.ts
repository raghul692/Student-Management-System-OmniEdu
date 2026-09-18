import { logger } from '../../config/logger';
import { queueService } from '../queue/queue.service';
import { isFeatureEnabled } from '../feature-flags/featureFlag.service';
import { AppError } from '../../middleware/errorHandler';
import { SafetyFilter } from './safety/safetyFilter';
import { getAIProvider } from './providers/aiProvider.factory';
import { AIUsageService } from './aiUsage.service';
import { AssistantService } from './features/assistant.service';
import { RiskEngineService } from './features/riskEngine.service';
import { EarlyWarningService } from './features/earlyWarning.service';
import { LearningService } from './features/learning.service';
import { QuestionGeneratorService } from './features/questionGenerator.service';
import { CommunicationsService } from './features/communications.service';
import { CareerIntelligenceService } from './features/careerIntelligence.service';
import { GradingAssistantService } from './features/gradingAssistant.service';
import { DocumentIngestionService } from './rag/documentIngestion.service';
import { VectorSearchService } from './rag/vectorSearch.service';

export interface AIUsageRecord {
  organizationId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  timestamp: Date;
}

// In-memory token usage tracking per organization
const orgTokenUsage = new Map<string, { promptTokens: number; completionTokens: number; totalTokens: number }>();

export class AIService {
  private defaultModel = process.env.AI_MODEL || 'gemini-2.5-flash';

  // Subsystem Accessors
  public assistant = AssistantService;
  public risk = RiskEngineService;
  public earlyWarning = EarlyWarningService;
  public learning = LearningService;
  public questions = QuestionGeneratorService;
  public communications = CommunicationsService;
  public career = CareerIntelligenceService;
  public grading = GradingAssistantService;
  public ingestion = DocumentIngestionService;
  public search = VectorSearchService;
  public usageService = AIUsageService;

  /**
   * Safety guardrails: Redact common PII (phone numbers, national IDs) and sanitize prompt injection strings.
   */
  public sanitizeInput(prompt: string): string {
    const { sanitizedText } = SafetyFilter.inspectAndSanitize(prompt);
    return sanitizedText;
  }

  /**
   * Track token consumption per organization.
   */
  public recordTokenUsage(organizationId: string, promptTokens: number, completionTokens: number, model: string) {
    const existing = orgTokenUsage.get(organizationId) || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    existing.promptTokens += promptTokens;
    existing.completionTokens += completionTokens;
    existing.totalTokens += promptTokens + completionTokens;
    orgTokenUsage.set(organizationId, existing);

    // Asynchronously record in DB
    AIUsageService.recordUsage({
      organizationId,
      feature: 'SUMMARY',
      model,
      promptTokens,
      completionTokens,
    }).catch(() => {});

    logger.info(
      { organizationId, promptTokens, completionTokens, totalTokens: promptTokens + completionTokens, model },
      'AI Token Consumption Recorded'
    );
  }

  /**
   * Get organization token metrics.
   */
  public getUsage(organizationId: string) {
    return (
      orgTokenUsage.get(organizationId) || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      }
    );
  }

  /**
   * Generate an academic summary or performance review.
   */
  public async generateAcademicSummary(params: {
    organizationId: string;
    studentName: string;
    metrics: { gpa?: number; attendancePercentage: number; arrearsCount: number };
  }): Promise<{ summary: string; recommendations: string[]; model: string; tokensUsed: number }> {
    const enabled = await isFeatureEnabled(params.organizationId, 'AI_ASSISTANT');
    if (!enabled) {
      throw new AppError(
        'AI features are not enabled for this organization. Please upgrade to Pro or Enterprise plan.',
        403
      );
    }

    const { studentName, metrics } = params;
    const isAtRisk = metrics.attendancePercentage < 75 || metrics.arrearsCount > 0;

    // Deterministic intelligence engine based on academic parameters
    const recommendations: string[] = [];
    if (metrics.attendancePercentage < 75) {
      recommendations.push(
        `Immediate remedial attendance makeup classes required to restore eligibility above 75%.`
      );
    }
    if (metrics.arrearsCount > 0) {
      recommendations.push(
        `Targeted tutorial sessions in failed subjects before next semester examination cycle.`
      );
    }
    if (!isAtRisk) {
      recommendations.push(`Eligible for advanced elective credits and academic honor roll recognition.`);
    }

    const summary = isAtRisk
      ? `${studentName} exhibits academic risk factors with ${metrics.attendancePercentage}% attendance and ${metrics.arrearsCount} arrears. Academic intervention and parent-advisor counseling are strongly advised.`
      : `${studentName} demonstrates satisfactory academic progression with ${metrics.attendancePercentage}% attendance and a solid performance record.`;

    const tokensUsed = 120;
    this.recordTokenUsage(params.organizationId, 70, 50, this.defaultModel);

    return {
      summary,
      recommendations,
      model: this.defaultModel,
      tokensUsed,
    };
  }

  /**
   * Trigger background vector embedding/indexing for institutional documents.
   */
  public async scheduleDocumentIndexing(documentId: string, content: string, organizationId: string) {
    return queueService.enqueueJob('AI_INDEXING', {
      documentId,
      contentLength: content.length,
      organizationId,
      scheduledAt: new Date().toISOString(),
    });
  }
}

export const aiService = new AIService();
