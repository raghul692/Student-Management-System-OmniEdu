# OMNIEDU — SITE RELIABILITY & INCIDENT RESPONSE RUNBOOK

## 1. Severity Classifications

| Severity | Definition | Target SLA / MTTR |
|---|---|---|
| **SEV-1 (Critical)** | Core ERP down, Database disconnected, Data corruption risk | Response: < 5 min, Resolution: < 30 min |
| **SEV-2 (High)** | Major feature degraded (e.g. Attendance marking failing, AI provider down) | Response: < 15 min, Resolution: < 2 hours |
| **SEV-3 (Medium)** | Non-critical service failure (e.g. Export job delayed, high queue depth) | Response: < 1 hour, Resolution: < 8 hours |
| **SEV-4 (Low)** | Cosmetic issue, minor telemetry anomaly | Next scheduled business sprint |

---

## 2. Common Failure Scenarios & Mitigation

### Scenario A: PostgreSQL Database Connection Failure (`SEV-1`)
- **Symptoms**: `/health/ready` returns HTTP 503 with `"database": "unhealthy"`.
- **Triaging Actions**:
  1. Check PostgreSQL container/process status: `docker compose ps postgres`
  2. Inspect database logs: `docker compose logs --tail=100 postgres`
  3. Verify connection pool exhaustion:
     - Check active connections in Postgres: `SELECT count(*) FROM pg_stat_activity;`
     - If exhausted, scale down or restart API instances.
  4. If database corruption is detected, initiate verified restore runbook:
     `npx tsx scripts/restore-database.ts --verify-only`

### Scenario B: Redis Outage (`SEV-2`)
- **Symptoms**: `/health/ready` reports Redis unhealthy. Rate limiter or cache logs warnings.
- **System Behavior**: Application automatically falls back to in-memory LRU caching and local rate limiters without dropping HTTP traffic.
- **Triaging Actions**:
  1. Check Redis process: `docker compose logs --tail=100 redis`
  2. Restart Redis: `docker compose restart redis`

### Scenario C: Cloud AI Provider Outage (`SEV-2`)
- **Symptoms**: External Gemini/OpenAI API returns HTTP 429 (Rate limit) or 503 (Unavailable).
- **System Behavior**: OmniEdu's `ResilientFallbackProvider` automatically detects downstream timeouts/errors and cascades to the deterministic local heuristic provider.
- **Triaging Actions**:
  1. Check `ai_provider_fallbacks_total` counter on `/metrics`.
  2. Verify API key quotas in Google AI Studio or OpenAI dashboard.

### Scenario D: Background Queue Backlog or Worker Crash (`SEV-3`)
- **Symptoms**: Queue depth increasing, dead-letter queue count > 0.
- **Triaging Actions**:
  1. Query queue metrics: `/metrics` (`queue_jobs_total{status="failed"}`)
  2. Inspect dead-letter jobs: invoke `queueService.getDeadLetterJobs()`.
  3. Re-queue transient failures: invoke `queueService.retryDeadLetterJob(jobId)`.
