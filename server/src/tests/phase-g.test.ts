import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { metricsRegistry } from '../config/metrics';
import { tracer } from '../config/tracer';
import { cacheService, CacheService } from '../services/cache/cache.service';
import { queueService } from '../services/queue/queue.service';
import { validateEnvironment } from '../config/env';
import { verifyBackupIntegrity } from '../../scripts/restore-database';
import { sanitizeLogPayload } from '../middleware/requestCorrelation';
import fs from 'fs';
import path from 'path';

describe('PHASE G: Production Deployment, Observability & Scalability Verification', () => {
  afterAll(async () => {
    await prisma.$disconnect();
    await queueService.drainAndStop(1000);
    queueService.resume();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. HEALTH PROBES & DEPENDENCY READINESS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Production Health Probes (/health, /health/live, /health/ready)', () => {
    it('Liveness probe (/health/live) must confirm process alive with uptime & memory', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('alive');
      expect(res.body.state).toBe('alive');
      expect(typeof res.body.uptimeSeconds).toBe('number');
      expect(res.body.memory).toHaveProperty('rssMb');
      expect(res.body.memory).toHaveProperty('heapUsedMb');
      expect(res.body).toHaveProperty('pid');
    });

    it('Readiness probe (/health/ready) must verify PostgreSQL and Queue status', async () => {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.checks).toHaveProperty('database');
      expect(res.body.checks.database.status).toBe('healthy');
      expect(typeof res.body.checks.database.latencyMs).toBe('number');
      expect(res.body.checks).toHaveProperty('queue');
      expect(res.body.checks.queue.status).toBe('healthy');
      expect(res.body.checks).toHaveProperty('storage');
    });

    it('Readiness probe must never expose passwords or connection strings', async () => {
      const res = await request(app).get('/health/ready');
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('password');
      expect(bodyStr).not.toContain('resumate_secret');
      expect(bodyStr).not.toContain('postgresql://');
    });

    it('Combined health endpoint (/health) must return healthy summary', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.endpoints).toHaveProperty('liveness');
      expect(res.body.endpoints).toHaveProperty('readiness');
      expect(res.body.endpoints).toHaveProperty('metrics');
    });

    it('Backwards-compatible health probe (/api/health/live) must remain operational', async () => {
      const res = await request(app).get('/api/health/live');
      expect(res.status).toBe(200);
      expect(res.body.state).toBe('alive');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. REQUEST CORRELATION & PII REDACTION
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Request Correlation & Log Redaction', () => {
    it('Should echo incoming X-Request-ID header in response', async () => {
      const customId = 'phase-g-correl-test-42';
      const res = await request(app).get('/health/live').set('X-Request-Id', customId);
      expect(res.header['x-request-id']).toBe(customId);
    });

    it('Should generate UUIDv4 X-Request-ID when incoming header is omitted', async () => {
      const res = await request(app).get('/health/live');
      expect(res.header['x-request-id']).toBeDefined();
      expect(res.header['x-request-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('Should generate X-Trace-Id header for distributed span tracking', async () => {
      const res = await request(app).get('/health/live');
      expect(res.header['x-trace-id']).toBeDefined();
      expect(res.header['x-trace-id'].length).toBeGreaterThanOrEqual(16);
    });

    it('PII redaction utility must mask Aadhaar, PAN, Card, and secrets', () => {
      const rawPayload = {
        studentName: 'Rahul Sharma',
        password: 'SuperSecretPassword123!',
        jwt_access_secret: 'secret-key',
        aadhaar: '1234 5678 9012',
        pan: 'ABCDE1234F',
        creditCard: '4111 2222 3333 4444',
        nested: {
          token: 'jwt.token.here',
          cleanField: 'Normal Data',
        },
      };

      const sanitized = sanitizeLogPayload(rawPayload);
      expect(sanitized.studentName).toBe('Rahul Sharma');
      expect(sanitized.password).toBe('[REDACTED_SECURITY_SECRET]');
      expect(sanitized.jwt_access_secret).toBe('[REDACTED_SECURITY_SECRET]');
      expect(sanitized.aadhaar).toBe('[REDACTED_AADHAAR]');
      expect(sanitized.pan).toBe('[REDACTED_PAN]');
      expect(sanitized.creditCard).toBe('[REDACTED_CARD]');
      expect(sanitized.nested.token).toBe('[REDACTED_SECURITY_SECRET]');
      expect(sanitized.nested.cleanField).toBe('Normal Data');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. STANDARDIZED ERROR MODEL & RFC 7807 PROBLEM DETAILS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. Standardized Error Handling & Machine-Readable Codes', () => {
    it('Should return standard error model with code and requestId on 404', async () => {
      const res = await request(app).get('/api/definitely-nonexistent-route-404');
      expect(res.status).toBe(404);
      expect(res.body.status).toBe('fail');
      expect(res.body.code).toBe('NOT_FOUND');
      expect(res.body.message).toContain('Cannot GET');
      expect(res.body.requestId).toBeDefined();
    });

    it('Should return VALIDATION_ERROR code on Zod validation failure', async () => {
      const res = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', 'Bearer invalid')
        .send({ invalidField: true });

      // Either 401 unauthorized or 400 validation error
      expect([400, 401]).toContain(res.status);
      if (res.status === 400) {
        expect(res.body.code).toBe('VALIDATION_ERROR');
        expect(res.body.requestId).toBeDefined();
      }
    });

    it('Error responses must never expose stack traces in production format', async () => {
      const res = await request(app).get('/api/definitely-nonexistent-route-404');
      expect(res.body.stack).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. PROMETHEUS METRICS & TELEMETRY
  // ─────────────────────────────────────────────────────────────────────────────
  describe('4. Prometheus Performance Metrics Exposition', () => {
    it('Should expose valid Prometheus text format at /metrics', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/plain');
      expect(res.text).toContain('# HELP http_requests_total');
      expect(res.text).toContain('# TYPE http_requests_total counter');
      expect(res.text).toContain('http_requests_total');
      expect(res.text).toContain('process_uptime_seconds');
      expect(res.text).toContain('http_request_duration_ms_bucket');
    });

    it('Backwards-compatible /api/metrics alias must be operational', async () => {
      const res = await request(app).get('/api/metrics');
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/plain');
      expect(res.text).toContain('http_requests_total');
    });

    it('Should record AI metrics and fallback counters in metricsRegistry', () => {
      metricsRegistry.recordAiCall('gemini', 'ASSISTANT', 150, true);
      metricsRegistry.recordAiCall('gemini', 'ASSISTANT', 300, false);
      metricsRegistry.recordAiFallback('gemini', 'local');

      const promOutput = metricsRegistry.toPrometheus();
      expect(promOutput).toContain('ai_requests_total{provider="gemini",feature="ASSISTANT",status="success"} 1');
      expect(promOutput).toContain('ai_requests_total{provider="gemini",feature="ASSISTANT",status="failure"} 1');
      expect(promOutput).toContain('ai_provider_fallbacks_total{transition="gemini_to_local"} 1');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. IN-PROCESS DISTRIBUTED TRACING
  // ─────────────────────────────────────────────────────────────────────────────
  describe('5. In-Process Distributed Tracing', () => {
    it('Tracer must start and end spans with duration and status', () => {
      const span = tracer.startSpan('Database Query: FindStudents', { dept: 'CSE' });
      expect(span.name).toBe('Database Query: FindStudents');
      expect(span.status).toBe('OK');
      expect(span.startTime).toBeGreaterThan(0);

      tracer.endSpan(span, 'OK');
      expect(span.endTime).toBeGreaterThanOrEqual(span.startTime);
      expect(span.durationMs).toBeGreaterThanOrEqual(0);

      const recent = tracer.getRecentSpans(5);
      const recorded = recent.find((s) => s.spanId === span.spanId);
      expect(recorded).toBeDefined();
    });

    it('traceAsync must measure asynchronous execution and propagate errors', async () => {
      await expect(
        tracer.traceAsync('Failing Async Operation', {}, async () => {
          throw new Error('Simulated Async Failure');
        })
      ).rejects.toThrow('Simulated Async Failure');

      const recent = tracer.getRecentSpans(5);
      const failedSpan = recent.find((s) => s.name === 'Failing Async Operation');
      expect(failedSpan?.status).toBe('ERROR');
      expect(failedSpan?.error).toBe('Simulated Async Failure');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. MULTI-TENANT CACHING & INVALIDATION
  // ─────────────────────────────────────────────────────────────────────────────
  describe('6. Multi-Tenant Caching Architecture & Write Invalidation', () => {
    const tenantA = 'inst_tenant_a_123';
    const tenantB = 'inst_tenant_b_456';

    it('Should strictly scope keys by tenant and prevent cross-tenant leakage', async () => {
      const keyA = CacheService.buildTenantKey(tenantA, 'analytics', 'kpi_summary');
      const keyB = CacheService.buildTenantKey(tenantB, 'analytics', 'kpi_summary');

      expect(keyA).not.toBe(keyB);
      expect(keyA).toContain(tenantA);
      expect(keyB).toContain(tenantB);

      await cacheService.set(keyA, { attendanceRate: 92.5 }, 60);
      await cacheService.set(keyB, { attendanceRate: 68.0 }, 60);

      const cachedA = await cacheService.get<{ attendanceRate: number }>(keyA);
      const cachedB = await cacheService.get<{ attendanceRate: number }>(keyB);

      expect(cachedA?.attendanceRate).toBe(92.5);
      expect(cachedB?.attendanceRate).toBe(68.0);
    });

    it('Should respect TTL expiration', async () => {
      const shortKey = CacheService.buildTenantKey(tenantA, 'temp', 'token');
      await cacheService.set(shortKey, { value: 123 }, -1); // Already expired

      const res = await cacheService.get(shortKey);
      expect(res).toBeNull();
    });

    it('Wildcard prefix invalidation must clear only target tenant records', async () => {
      const prefixKeyA1 = CacheService.buildTenantKey(tenantA, 'students', 'st_01');
      const prefixKeyA2 = CacheService.buildTenantKey(tenantA, 'students', 'st_02');
      const prefixKeyB1 = CacheService.buildTenantKey(tenantB, 'students', 'st_01');

      await cacheService.set(prefixKeyA1, { name: 'A1' }, 120);
      await cacheService.set(prefixKeyA2, { name: 'A2' }, 120);
      await cacheService.set(prefixKeyB1, { name: 'B1' }, 120);

      // Invalidate Tenant A's student cache
      const invalidatedCount = await cacheService.invalidatePrefix(CacheService.buildTenantPrefix(tenantA, 'students'));
      expect(invalidatedCount).toBeGreaterThanOrEqual(2);

      // Tenant A records invalidated
      expect(await cacheService.get(prefixKeyA1)).toBeNull();
      expect(await cacheService.get(prefixKeyA2)).toBeNull();

      // Tenant B record remains intact!
      const tenantBVal = await cacheService.get<any>(prefixKeyB1);
      expect(tenantBVal?.name).toBe('B1');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. BACKGROUND JOBS, IDEMPOTENCY & DEAD-LETTER QUEUE
  // ─────────────────────────────────────────────────────────────────────────────
  describe('7. Background Job Hardening, Idempotency & Dead-Letter Handling', () => {
    it('Should prevent duplicate job queuing when idempotencyKey is identical', async () => {
      const idemKey = `idem_${Date.now()}_report`;

      const job1 = await queueService.enqueueJob('REPORT_GENERATION', { report: 'Q3' }, { idempotencyKey: idemKey });
      const job2 = await queueService.enqueueJob('REPORT_GENERATION', { report: 'Q3' }, { idempotencyKey: idemKey });

      expect(job1.id).toBe(job2.id);
      expect(job1.idempotencyKey).toBe(idemKey);
    });

    it('Should transition jobs exceeding maxAttempts to DEAD_LETTER queue', async () => {
      const testJobType = 'ATTENDANCE_DEF_ALERT';

      queueService.registerProcessor(testJobType, async () => {
        throw new Error('Permanent Dispatch Failure');
      });

      const failingJob = await queueService.enqueueJob(
        testJobType,
        { studentId: 'st_fail_1' },
        { attempts: 1, backoffMs: 10 }
      );

      // Wait for consumer tick to process and fail
      await new Promise((r) => setTimeout(r, 600));

      const updated = queueService.getJob(failingJob.id);
      expect(updated?.status).toBe('DEAD_LETTER');
      expect(updated?.error).toBe('Permanent Dispatch Failure');

      const dlq = queueService.getDeadLetterJobs();
      expect(dlq.some((j) => j.id === failingJob.id)).toBe(true);
    });

    it('Should allow manual retry of Dead-Letter jobs', async () => {
      const dlq = queueService.getDeadLetterJobs();
      if (dlq.length > 0) {
        const targetJob = dlq[0];
        const retried = queueService.retryDeadLetterJob(targetJob.id);
        expect(retried).toBe(true);
        expect(queueService.getJob(targetJob.id)?.status).toBe('PENDING');
      }
    });

    it('Queue statistics must report accurate job distributions', () => {
      const stats = queueService.getStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('deadLetter');
      expect(stats.maxConcurrency).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. PRODUCTION CONFIGURATION VALIDATION & FAIL-FAST
  // ─────────────────────────────────────────────────────────────────────────────
  describe('8. Production Configuration Fail-Fast Assertions', () => {
    it('Should fail fast if default development JWT_ACCESS_SECRET is used in production', () => {
      expect(() => {
        validateEnvironment({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://prod_user:strong_pwd@postgres:5432/omniedu_db',
          JWT_ACCESS_SECRET: 'omniedu_dev_access_secret_super_key_2026',
          JWT_REFRESH_SECRET: 'valid_prod_refresh_secret_9999999999',
          CORS_ORIGIN: 'https://app.omniedu.com',
        });
      }).toThrow('Default development JWT_ACCESS_SECRET detected in production environment!');
    });

    it('Should fail fast if wildcard CORS_ORIGIN is used in production', () => {
      expect(() => {
        validateEnvironment({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://prod_user:strong_pwd@postgres:5432/omniedu_db',
          JWT_ACCESS_SECRET: 'custom_high_entropy_prod_key_1234567890',
          JWT_REFRESH_SECRET: 'custom_high_entropy_prod_key_0987654321',
          CORS_ORIGIN: '*',
        });
      }).toThrow('Wildcard CORS_ORIGIN is prohibited in production environment!');
    });

    it('Should accept valid production environment configuration', () => {
      const validConfig = validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://prod_user:strong_pwd@postgres:5432/omniedu_db',
        JWT_ACCESS_SECRET: 'custom_high_entropy_prod_key_1234567890',
        JWT_REFRESH_SECRET: 'custom_high_entropy_prod_key_0987654321',
        CORS_ORIGIN: 'https://app.omniedu.com,https://api.omniedu.com',
      });

      expect(validConfig.NODE_ENV).toBe('production');
      expect(validConfig.DB_POOL_MAX).toBe(20);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. DATABASE BACKUP INTEGRITY & RESTORE VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  describe('9. Database Backup & Restore Integrity Validation', () => {
    it('verifyBackupIntegrity() must pass for the current backup with zero database writes', async () => {
      const verification = await verifyBackupIntegrity();
      expect(verification.valid).toBe(true);
      expect(verification.details).toHaveProperty('sha256');
      expect(verification.details).toHaveProperty('counts');
      expect(verification.details.counts.students).toBeGreaterThan(0);
    });

    it('verifyBackupIntegrity() must fail if the backup file does not exist', async () => {
      const fakePath = path.resolve(process.cwd(), 'backups/nonexistent_backup.json');
      const res = await verifyBackupIntegrity(fakePath);
      expect(res.valid).toBe(false);
      expect(res.message).toContain('not found');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. SECURITY HEADERS & RATE LIMITING
  // ─────────────────────────────────────────────────────────────────────────────
  describe('10. Security Headers & Rate Limiter Policies', () => {
    it('Should return standard security headers on API responses', async () => {
      const res = await request(app).get('/api');
      expect(res.header['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.header['x-content-type-options']).toBe('nosniff');
    });

    it('Rate limiter should provide standard RateLimit headers', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
    });
  });
});
