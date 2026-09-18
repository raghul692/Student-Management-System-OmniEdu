import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { queueService } from '../services/queue/queue.service';
import { redisClient } from '../config/redis';
import fs from 'fs';
import path from 'path';

export const healthRouter = Router();

/**
 * Liveness Probe: Confirms the Node.js event loop is running and HTTP server is alive.
 * Never depends on external downstream services (per Kubernetes / Cloud design standards).
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  const mem = process.memoryUsage();
  const uptime = process.uptime();
  res.status(200).json({
    status: 'alive',
    state: 'alive',
    health: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'OmniEdu Multi-Tenant ERP API v2.0',
    version: '2.0.0',
    uptime,
    uptimeSeconds: Math.floor(uptime),
    memory: {
      rssMb: Math.round(mem.rss / (1024 * 1024)),
      heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
    },
    pid: process.pid,
  });
});

/**
 * Readiness Probe: Confirms that critical dependencies (PostgreSQL, Queue, Storage, Redis) are available.
 * Returns HTTP 200 if ready to serve traffic, or HTTP 503 if critical dependencies are down.
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: 'healthy' | 'unhealthy' | 'degraded' | 'not_configured'; latencyMs?: number; message?: string }> = {};
  let isReady = true;

  // 1. PostgreSQL Database Check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'healthy',
      latencyMs: Date.now() - dbStart,
    };
  } catch (err: any) {
    isReady = false;
    checks.database = {
      status: 'unhealthy',
      latencyMs: Date.now() - dbStart,
      message: 'Database connection failed',
    };
  }

  // 2. Queue Subsystem Check
  try {
    const queueStats = queueService.getStats();
    checks.queue = {
      status: 'healthy',
      message: `Active: ${queueStats.active}, Pending: ${queueStats.pending}, Queued: ${queueStats.queuedInLine}`,
    };
  } catch (err: any) {
    checks.queue = {
      status: 'degraded',
      message: 'Queue statistics unavailable',
    };
  }

  // 3. Storage Subsystem Check
  try {
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    checks.storage = {
      status: 'healthy',
      message: 'Upload volume accessible',
    };
  } catch (err: any) {
    checks.storage = {
      status: 'degraded',
      message: 'Upload volume access check failed',
    };
  }

  // 4. Redis Check
  if (redisClient.isConfigured()) {
    const redisStart = Date.now();
    try {
      const pingRes = await redisClient.ping();
      checks.redis = {
        status: pingRes ? 'healthy' : 'unhealthy',
        latencyMs: Date.now() - redisStart,
      };
      if (!pingRes) isReady = false;
    } catch (err: any) {
      checks.redis = {
        status: 'unhealthy',
        latencyMs: Date.now() - redisStart,
        message: 'Redis ping failed',
      };
      // Redis outage doesn't bring down read paths if memory fallback is active
    }
  } else {
    checks.redis = {
      status: 'not_configured',
      message: 'In-memory bounded cache fallback active',
    };
  }

  const statusCode = isReady ? 200 : 503;
  res.status(statusCode).json({
    status: isReady ? 'ready' : 'unhealthy',
    database: checks.database?.status || (isReady ? 'healthy' : 'unhealthy'),
    timestamp: new Date().toISOString(),
    checks,
    uptime: process.uptime(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

/**
 * Combined Health Overview
 */
healthRouter.get('/', async (req: Request, res: Response) => {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (err) {
    dbOk = false;
  }

  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'healthy' : 'unhealthy',
    service: 'OmniEdu Multi-Tenant ERP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      liveness: '/health/live',
      readiness: '/health/ready',
      metrics: '/metrics',
    },
  });
});
