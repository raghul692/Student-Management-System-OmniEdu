import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';

export interface RecordUsageParams {
  organizationId: string;
  institutionId?: string;
  userId?: string;
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs?: number;
  success?: boolean;
}

export class AIUsageService {
  // Estimated cost per 1M tokens ($0.15 input, $0.60 output for lightweight models)
  private static COST_PER_1M_PROMPT = 0.15;
  private static COST_PER_1M_COMPLETION = 0.60;

  /**
   * Record AI execution tokens and cost in database.
   */
  public static async recordUsage(params: RecordUsageParams) {
    const totalTokens = params.promptTokens + params.completionTokens;
    const costUsd =
      (params.promptTokens / 1_000_000) * this.COST_PER_1M_PROMPT +
      (params.completionTokens / 1_000_000) * this.COST_PER_1M_COMPLETION;

    try {
      await prisma.aiUsageRecord.create({
        data: {
          organizationId: params.organizationId,
          institutionId: params.institutionId,
          userId: params.userId,
          feature: params.feature,
          model: params.model,
          promptTokens: params.promptTokens,
          completionTokens: params.completionTokens,
          totalTokens,
          costUsd: Number(costUsd.toFixed(6)),
          latencyMs: params.latencyMs || 0,
          success: params.success ?? true,
        },
      });
    } catch (err) {
      // In-memory or logging fallback if DB transient error
      console.warn('Could not record AI usage record in DB:', err);
    }
  }

  /**
   * Enforce SaaS tier monthly token quota.
   */
  public static async checkQuota(organizationId: string): Promise<void> {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    const planTier = (sub?.planTier || 'BASIC').toUpperCase();
    let maxTokens = 100_000; // Starter / Basic: 100k tokens
    if (planTier === 'PRO') maxTokens = 1_000_000; // Pro: 1M tokens
    if (planTier === 'ENTERPRISE') maxTokens = 10_000_000; // Enterprise: 10M tokens

    // Sum tokens for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const sumResult = await prisma.aiUsageRecord.aggregate({
      where: {
        organizationId,
        timestamp: { gte: startOfMonth },
      },
      _sum: { totalTokens: true },
    });

    const usedTokens = sumResult._sum.totalTokens || 0;
    if (usedTokens >= maxTokens) {
      throw new AppError(
        `AI Monthly Token Quota Exceeded (${usedTokens.toLocaleString()} / ${maxTokens.toLocaleString()}). Please upgrade your SaaS subscription tier.`,
        429
      );
    }
  }

  /**
   * Get organization aggregate AI usage and analytics breakdown.
   */
  public static async getUsageAnalytics(organizationId: string) {
    const records = await prisma.aiUsageRecord.findMany({
      where: { organizationId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    const totalUsage = await prisma.aiUsageRecord.aggregate({
      where: { organizationId },
      _sum: {
        totalTokens: true,
        promptTokens: true,
        completionTokens: true,
        costUsd: true,
      },
      _count: { id: true },
    });

    // Breakdown by feature
    const featureBreakdown: Record<string, number> = {};
    for (const r of records) {
      featureBreakdown[r.feature] = (featureBreakdown[r.feature] || 0) + r.totalTokens;
    }

    const sub = await prisma.subscription.findUnique({
      where: { organizationId },
    });
    const planTier = (sub?.planTier || 'PRO').toUpperCase();
    let maxTokens = 1_000_000;
    if (planTier === 'ENTERPRISE') maxTokens = 10_000_000;
    if (planTier === 'BASIC' || planTier === 'STARTER') maxTokens = 100_000;

    const tokensConsumed = totalUsage._sum.totalTokens || 0;

    return {
      organizationId,
      planTier,
      tokenQuota: maxTokens,
      tokensConsumed,
      quotaRemaining: Math.max(0, maxTokens - tokensConsumed),
      totalRequests: totalUsage._count.id,
      totalTokens: tokensConsumed,
      promptTokens: totalUsage._sum.promptTokens || 0,
      completionTokens: totalUsage._sum.completionTokens || 0,
      estimatedCostUsd: Number((totalUsage._sum.costUsd || 0).toFixed(4)),
      estimatedCostInr: Number(((totalUsage._sum.costUsd || 0) * 83.5).toFixed(2)),
      featureBreakdown,
      recentRecords: records.slice(0, 15),
    };
  }
}
