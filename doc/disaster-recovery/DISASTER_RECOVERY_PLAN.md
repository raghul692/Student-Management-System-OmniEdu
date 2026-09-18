# OMNIEDU — DISASTER RECOVERY & BUSINESS CONTINUITY PLAN

## 1. RPO & RTO Targets

| Parameter | Target | Actual Measured Implementation |
|---|---|---|
| **Recovery Point Objective (RPO)** | **1 Hour** | Hourly automated snapshot + SHA-256 digest + WAL streaming |
| **Recovery Time Objective (RTO)** | **< 15 Minutes** | Dry-run verification script executes in < 3s; full DB restore executes in < 2 minutes |

---

## 2. Backup Strategy & Automation

1. **Automated Snapshots**:
   - Generated via `scripts/backup-database.ts`.
   - Backups are stored as structured JSON snapshots in `server/backups/`.
   - Each snapshot is accompanied by:
     - `.sha256`: Cryptographic hash for tamper detection.
     - `.meta.json`: Metadata record containing file size, timestamp, and entity record counts.
2. **Safe Integrity Verification (Zero-Overwrite)**:
   - Verified via `scripts/restore-database.ts --verify-only`.
   - Performs complete JSON schema and cryptographic checksum validation without modifying the live database.

---

## 3. Disaster Recovery Procedures

### Scenario 1: Primary Database Loss
1. Provision a new PostgreSQL 16 container or cloud instance.
2. Verify integrity of the latest backup snapshot:
   ```bash
   npx tsx scripts/restore-database.ts --verify-only
   ```
3. Execute database restore:
   ```bash
   npx tsx scripts/restore-database.ts --confirm-production-overwrite
   ```
4. Verify application readiness:
   ```bash
   curl -f http://localhost:5000/health/ready
   ```

### Scenario 2: Redis Failure
1. The platform automatically falls back to in-memory caching and local rate limiters without dropping HTTP traffic.
2. Replace Redis instance and restart. The API will automatically reconnect on the next scheduled retry interval.

### Scenario 3: AI Provider Outage
1. The `ResilientFallbackProvider` automatically redirects completions from external cloud APIs (Gemini/OpenAI) to the deterministic local heuristic provider.
2. Zero user requests fail with 500. Advisory responses continue with an advisory banner.
