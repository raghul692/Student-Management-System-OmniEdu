import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { metricsRegistry } from '../src/config/metrics';
import { cacheService, CacheService } from '../src/services/cache/cache.service';
import { queueService } from '../src/services/queue/queue.service';

async function runSmokeTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 OMNIEDU PRODUCTION SMOKE TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let total = 0;

  function assertCheck(name: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [SMOKE PASS] ${name}${details ? ` — ${details}` : ''}`);
    } else {
      console.error(`❌ [SMOKE FAIL] ${name}${details ? ` — ${details}` : ''}`);
      throw new Error(`Smoke assertion failed: ${name}`);
    }
  }

  try {
    // 1. Liveness Probe
    const liveRes = await request(app).get('/health/live');
    assertCheck('Liveness Probe (/health/live)', liveRes.status === 200 && liveRes.body.state === 'alive', `Uptime: ${liveRes.body.uptimeSeconds}s`);

    // 2. Readiness Probe
    const readyRes = await request(app).get('/health/ready');
    assertCheck(
      'Readiness Probe (/health/ready)',
      readyRes.status === 200 && readyRes.body.checks?.database?.status === 'healthy',
      `DB Latency: ${readyRes.body.checks?.database?.latencyMs}ms`
    );

    // 3. Root Health Summary
    const healthRes = await request(app).get('/health');
    assertCheck('Root Health Summary (/health)', healthRes.status === 200 && healthRes.body.status === 'healthy');

    // 4. Prometheus Metrics Exposition
    const metricsRes = await request(app).get('/metrics');
    assertCheck(
      'Prometheus Metrics Endpoint (/metrics)',
      metricsRes.status === 200 &&
        metricsRes.text.includes('process_uptime_seconds') &&
        metricsRes.text.includes('http_requests_total'),
      `Content-Type: ${metricsRes.header['content-type']}`
    );

    // 5. Request Correlation Header Echo
    const customReqId = 'smoke-test-correl-999';
    const echoRes = await request(app).get('/health/live').set('X-Request-Id', customReqId);
    assertCheck(
      'Request Correlation ID Echo',
      echoRes.header['x-request-id'] === customReqId,
      `X-Request-Id: ${echoRes.header['x-request-id']}`
    );

    // 6. RFC 7807 Error Model on 404
    const notFoundRes = await request(app).get('/api/unmapped-endpoint-path');
    assertCheck(
      'Standardized Error Model on 404',
      notFoundRes.status === 404 &&
        notFoundRes.body.status === 'fail' &&
        notFoundRes.body.code === 'NOT_FOUND' &&
        Boolean(notFoundRes.body.requestId),
      `Code: ${notFoundRes.body.code}, RequestId: ${notFoundRes.body.requestId}`
    );

    // 7. Public API Gateway Route
    const apiIndexRes = await request(app).get('/api');
    assertCheck('Public API Gateway Route (/api)', apiIndexRes.status === 200 && apiIndexRes.body.name?.includes('OmniEdu'));

    // 8. Tenant Cache Scoping
    const testKey1 = CacheService.buildTenantKey('inst-smoke-a', 'settings', 'config');
    const testKey2 = CacheService.buildTenantKey('inst-smoke-b', 'settings', 'config');
    await cacheService.set(testKey1, { theme: 'dark', inst: 'A' }, 60);
    await cacheService.set(testKey2, { theme: 'light', inst: 'B' }, 60);

    const valA = await cacheService.get<any>(testKey1);
    const valB = await cacheService.get<any>(testKey2);
    assertCheck(
      'Multi-Tenant Cache Key Isolation',
      valA?.inst === 'A' && valB?.inst === 'B' && testKey1 !== testKey2,
      `Tenant A: ${valA?.inst}, Tenant B: ${valB?.inst}`
    );

    // 9. Queue Idempotency
    const idemKey = 'smoke_idempotency_key_123';
    const job1 = await queueService.enqueueJob('REPORT_GENERATION', { scope: 'smoke' }, { idempotencyKey: idemKey });
    const job2 = await queueService.enqueueJob('REPORT_GENERATION', { scope: 'smoke' }, { idempotencyKey: idemKey });
    assertCheck('Background Job Idempotency Guard', job1.id === job2.id, `Job ID deduplicated: ${job1.id}`);

    // 10. Database Multi-Tenant Query
    const orgsCount = await prisma.organization.count();
    const studentsCount = await prisma.student.count();
    assertCheck(
      'Database Fixtures & Multi-Tenant State',
      orgsCount > 0 && studentsCount > 0,
      `${orgsCount} organizations, ${studentsCount} students active`
    );

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`🎉 ALL ${passed}/${total} SMOKE TESTS PASSED CLEANLY`);
    console.log('═══════════════════════════════════════════════════════════════\n');
  } catch (err: any) {
    console.error('\n❌ Smoke Test Execution Aborted:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runSmokeTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
