import { Request, Response, NextFunction } from 'express';
import { prisma, requireInstitutionContext } from '../../config/prisma';
import { getEntitlements } from '../../services/entitlements/entitlement.service';

export async function getSystemStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const signals: Record<string, { status: string; detail?: string }> = {};

    // 1. Database
    try {
      await prisma.$queryRaw`SELECT 1`;
      signals.database = { status: 'OPERATIONAL' };
    } catch (e: any) {
      signals.database = { status: 'DEGRADED', detail: e.message };
    }

    // 2. AI Provider
    const aiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    signals.aiProvider = aiKey
      ? { status: 'OPERATIONAL' }
      : { status: 'DEGRADED', detail: 'No AI provider key configured — falling back to LocalHeuristic' };

    // 3. Queue / Redis (check if queue env var present)
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
    signals.queue = redisUrl
      ? { status: 'OPERATIONAL' }
      : { status: 'PARTIAL_OUTAGE', detail: 'Queue using in-memory fallback (no Redis configured)' };

    // 4. Storage
    const storageKey = process.env.S3_BUCKET || process.env.GCS_BUCKET;
    signals.storage = storageKey
      ? { status: 'OPERATIONAL' }
      : { status: 'PARTIAL_OUTAGE', detail: 'No cloud storage configured — using local fallback' };

    const overall = Object.values(signals).some((s) => s.status === 'DEGRADED')
      ? 'DEGRADED'
      : Object.values(signals).some((s) => s.status === 'PARTIAL_OUTAGE')
      ? 'PARTIAL_OUTAGE'
      : 'OPERATIONAL';

    return res.status(200).json({
      status: 'success',
      data: {
        overall,
        signals,
        checkedAt: new Date().toISOString(),
        version: '2.0.0',
        phase: 'H',
      },
    });
  } catch (err) { next(err); }
}

export async function getEntitlementsForOrg(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = requireInstitutionContext();
    const result = await getEntitlements(ctx.organizationId);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) { next(err); }
}
