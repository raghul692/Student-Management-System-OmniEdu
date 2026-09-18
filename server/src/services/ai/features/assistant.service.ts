import { prisma, InstitutionContext as TenantContext } from '../../../config/prisma';
import { getAIProvider } from '../providers/aiProvider.factory';
import { AIChatMessage } from '../providers/aiProvider.interface';
import { SafetyFilter } from '../safety/safetyFilter';
import { AIToolRegistry, AI_ERP_TOOLS } from '../tools/aiToolRegistry';
import { VectorSearchService } from '../rag/vectorSearch.service';
import { AppError } from '../../../middleware/errorHandler';

export interface AssistantChatParams {
  conversationId?: string;
  message: string;
  ctx: TenantContext;
}

export class AssistantService {
  /**
   * Handle user chat query with role-specific context, tool calling, and RAG knowledge grounding.
   */
  public static async chat(params: AssistantChatParams) {
    const { ctx, message } = params;
    if (!ctx.institutionId) {
      throw new AppError('Tenant isolation error: No active campus context', 400);
    }

    // 1. Safety & PII check
    const safety = SafetyFilter.inspectAndSanitize(message);
    if (safety.injectionDetected) {
      return {
        reply: 'Your request contained restricted instructions or disallowed system prompt directives. Please submit a valid educational query.',
        sources: [],
        toolCalls: [],
        tokensUsed: 25,
      };
    }

    // 2. Load or create conversation
    let conv = params.conversationId
      ? await prisma.aiConversation.findFirst({
          where: { id: params.conversationId, institutionId: ctx.institutionId },
        })
      : null;

    if (!conv) {
      conv = await prisma.aiConversation.create({
        data: {
          organizationId: ctx.organizationId,
          institutionId: ctx.institutionId,
          userId: ctx.userId,
          title: message.slice(0, 40) + '...',
        },
      });
    }

    // 3. Save User message with PII redacted
    await prisma.aiMessage.create({
      data: {
        conversationId: conv.id,
        role: 'user',
        content: safety.sanitizedText,
      },
    });

    // 4. Check for relevant RAG documents (treated as untrusted context)
    const ragSources = await VectorSearchService.search(safety.sanitizedText, ctx.institutionId, {
      limit: 3,
      minScore: 0.28,
    });

    let ragContext = '';
    if (ragSources.length > 0) {
      ragContext =
        `\n[VERIFIED INSTITUTIONAL KNOWLEDGE SOURCES]:\n` +
        ragSources
          .map(
            (s, idx) =>
              `Source ${idx + 1} (${s.documentTitle}):\n${SafetyFilter.sanitizeDocumentContext(s.content)}`
          )
          .join('\n\n');
    }

    // 5. Build System Prompt with Tenant Context & Role Scoping
    const systemPrompt = `You are OmniEdu AI Assistant, an authoritative educational assistant.
Current User Context:
- Role: ${ctx.institutionRole}
- User ID: ${ctx.userId}
- Department: ${ctx.deptId || 'Institution-wide'}
- Institution ID: ${ctx.institutionId}

Guidelines:
1. Only provide data the user's role is permitted to see. Never disclose other institutions' records or system secrets.
2. If citing institutional rules, rely ONLY on the verified knowledge sources provided below.
3. If information is not in the database or knowledge base, state clearly that the record could not be verified.
${ragContext}`;

    // 6. Check for Tool Invocations
    const lower = safety.sanitizedText.toLowerCase();
    const executedTools: any[] = [];
    let toolSummary = '';

    try {
      if (lower.includes('attendance') || lower.includes('defaulter')) {
        const result = await AIToolRegistry.executeTool('getAttendance', { belowThreshold: 75 }, ctx);
        executedTools.push({ tool: 'getAttendance', result });
        toolSummary += `\n[ATTENDANCE TOOL OUTPUT]: Found ${result.defaultersCount} students below 75% attendance. Defaulters: ${JSON.stringify(result.defaulters.slice(0, 5))}`;
      } else if (lower.includes('student') || lower.includes('class') || lower.includes('enroll')) {
        const result = await AIToolRegistry.executeTool('getStudents', { limit: 10 }, ctx);
        executedTools.push({ tool: 'getStudents', result });
        toolSummary += `\n[STUDENTS TOOL OUTPUT]: Retrieved ${result.total} students.`;
      } else if (lower.includes('mark') || lower.includes('grade') || lower.includes('score') || lower.includes('arrear')) {
        const result = await AIToolRegistry.executeTool('getMarks', {}, ctx);
        executedTools.push({ tool: 'getMarks', result });
        toolSummary += `\n[MARKS TOOL OUTPUT]: Retrieved ${result.marksCount} grade records.`;
      } else if (lower.includes('fee') || lower.includes('payment') || lower.includes('dues')) {
        const result = await AIToolRegistry.executeTool('getFees', {}, ctx);
        executedTools.push({ tool: 'getFees', result });
        toolSummary += `\n[FEES TOOL OUTPUT]: ${JSON.stringify(result)}`;
      }
    } catch (toolErr: any) {
      toolSummary += `\n[ACCESS NOTICE]: ${toolErr.message || 'Operation not permitted for current role'}`;
    }

    // 7. Generate Response via AI Provider
    const provider = getAIProvider();
    const historyMessages: AIChatMessage[] = [
      { role: 'user', content: safety.sanitizedText + (toolSummary ? `\n${toolSummary}` : '') },
    ];

    const completion = await provider.generateCompletion(historyMessages, {
      systemPrompt,
      temperature: 0.2,
      maxTokens: 1024,
    });

    const reply = completion.content;

    // 8. Save Assistant message
    await prisma.aiMessage.create({
      data: {
        conversationId: conv.id,
        role: 'assistant',
        content: reply,
        toolCalls: executedTools.length > 0 ? executedTools : undefined,
        sources: ragSources.length > 0 ? ragSources.map(s => ({ title: s.documentTitle, score: s.similarityScore })) : undefined,
        tokensUsed: completion.totalTokens,
      },
    });

    return {
      conversationId: conv.id,
      reply,
      sources: ragSources,
      toolCalls: executedTools,
      tokensUsed: completion.totalTokens,
      model: completion.model,
    };
  }
}
