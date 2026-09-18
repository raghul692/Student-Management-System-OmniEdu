# OMNIEDU — SERVICE LEVEL OBJECTIVES (SLOS) & ALERTING RULES

## 1. Service Level Objectives (SLOs)

| Service Area | SLO Metric | Target | Measurement Window |
|---|---|---|---|
| **API Availability** | Uptime of `/health/live` & `/health/ready` | **99.9%** | Rolling 30 Days |
| **API Latency (p50)** | Fast read/write endpoints | **< 100 ms** | 5-Minute Window |
| **API Latency (p95)** | Complex aggregations & search | **< 500 ms** | 5-Minute Window |
| **AI Request Latency** | Streaming completions & RAG search | **< 2000 ms** | 5-Minute Window |
| **Error Rate** | 5xx HTTP responses / Total requests | **< 0.1%** | 5-Minute Window |
| **Queue Throughput** | Background job execution latency | **< 5000 ms** | 10-Minute Window |

---

## 2. Actionable Production Alerting Rules

### Alert 1: API Readiness Probe Failure (`P1 - Critical`)
- **Condition**: `probe_success{endpoint="/health/ready"} == 0` for 2 consecutive minutes.
- **Action**: Page on-call engineer immediately. Check PostgreSQL and Redis status.

### Alert 2: High 5xx Error Rate Spike (`P1 - Critical`)
- **Condition**: `rate(http_requests_by_status{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05` (5% error rate).
- **Action**: Check server logs for unhandled exceptions or database connection pool exhaustion.

### Alert 3: Latency Degradation (`P2 - High`)
- **Condition**: `http_request_duration_ms_bucket{le="1000"} / http_request_duration_ms_count < 0.90` (p90 > 1000ms for 5 minutes).
- **Action**: Inspect slow queries, missing indexes, or external AI API latency.

### Alert 4: AI Provider Cascade Alert (`P2 - High`)
- **Condition**: `rate(ai_provider_fallbacks_total[5m]) > 0` for 5 minutes.
- **Action**: Cloud provider is rate-limiting or offline; platform has degraded to local heuristic provider. Verify cloud quota.

### Alert 5: Dead-Letter Queue (DLQ) Accumulation (`P3 - Warning`)
- **Condition**: `queue_jobs_total{status="failed"} > 5` within 15 minutes.
- **Action**: Inspect dead-letter jobs via `queueService.getDeadLetterJobs()`.
