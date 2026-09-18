# OMNIEDU — OBSERVABILITY & TELEMETRY ARCHITECTURE

## 1. Observability Pillars

OmniEdu implements the three pillars of modern cloud-native observability:
1. **Structured Contextual Logging** (Pino + AsyncLocalStorage)
2. **Prometheus Performance Metrics** (Real-time counters & histograms at `/metrics`)
3. **In-Process Distributed Tracing** (OpenTelemetry-compatible span model)

---

## 2. Request Correlation & Distributed Context

Every inbound HTTP request flows through `requestCorrelationMiddleware`:
1. Checks for incoming `X-Request-ID` or generates a UUIDv4.
2. Checks for `X-Trace-ID` or generates a 16-byte hex trace ID.
3. Sets up an execution scope in `AsyncLocalStorage<RequestContext>`.
4. Downstream services, database query middleware, and logger automatically inherit `requestId`, `traceId`, and `institutionId`.
5. Logs output structured JSON:
   ```json
   {
     "level": "info",
     "time": "2026-09-10T16:33:05.123Z",
     "service": "omniedu-api",
     "env": "production",
     "requestId": "4b2f5a18-4540-4912-84d1-6cf4821ecf4e",
     "traceId": "4c997123b4a60069ddb1ecfbeae00360",
     "institutionId": "inst-apollo-eng",
     "method": "POST",
     "path": "/api/attendance/mark",
     "statusCode": 200,
     "durationMs": 42
   }
   ```

---

## 3. PII Redaction Engine

All log payloads pass through `sanitizeLogPayload`:
- Cryptographic keys, secrets, passwords, cookies, and tokens are replaced with `[REDACTED_SECURITY_SECRET]`.
- Aadhaar 12-digit numbers are replaced with `[REDACTED_AADHAAR]`.
- PAN alphanumeric patterns are replaced with `[REDACTED_PAN]`.
- Credit card 16-digit numbers are replaced with `[REDACTED_CARD]`.

---

## 4. Prometheus Metrics Surface

The `/metrics` endpoint exports:
- `http_requests_total`: Monotonically increasing counter of requests.
- `http_active_requests`: Gauge of current in-flight connections.
- `http_request_duration_ms_bucket`: Cumulative latency histogram.
- `http_requests_by_status`: Distribution of status codes (200, 400, 401, 404, 500).
- `ai_requests_total`: Provider and feature breakdown.
- `ai_provider_fallbacks_total`: Provider failover transitions.
- `queue_jobs_total`: Completed, active, and failed jobs.
- `cache_hits_total`, `cache_misses_total`: Cache efficiency ratio.
- `process_memory_rss_bytes`: Memory footprint.
- `process_uptime_seconds`: Node.js process longevity.
