# OMNIEDU — ZERO-DOWNTIME DATABASE MIGRATION GUIDE

## 1. Migration Philosophy & Rules

1. **Never Automatically Drop Columns or Tables in Production**:
   - Dropping fields breaks active in-flight application pods during rolling deployments.
   - Always follow the **Expand and Contract** pattern across releases.
2. **Mandatory Pre-Migration Snapshot**:
   - Before executing `prisma migrate deploy` in production, an automated verified snapshot must be generated:
     ```bash
     npx tsx scripts/backup-database.ts
     npx tsx scripts/restore-database.ts --verify-only
     ```
3. **Idempotency**:
   - Migrations must be strictly additive and idempotent.
   - DDL changes must be tested against staging before applying to production.

---

## 2. Expand and Contract Pattern

When altering or renaming database columns:

### Phase 1: Expand (Release N)
- Add the new column as optional (`nullable`).
- Deploy updated application pods that write to both the old and new columns, reading from the new column if present.

### Phase 2: Backfill (Release N+1)
- Run an asynchronous backfill migration or worker script to populate historical records in the new column.

### Phase 3: Contract (Release N+2)
- Update code to read exclusively from the new column.
- In a subsequent scheduled maintenance release, drop the deprecated old column.

---

## 3. Deployment Command Sequence

```bash
# 1. Generate verified database backup
npm run release:backup (or npx tsx scripts/backup-database.ts)

# 2. Deploy migrations
npx prisma migrate deploy

# 3. Check health and connectivity
curl -f http://localhost:5000/health/ready
```
