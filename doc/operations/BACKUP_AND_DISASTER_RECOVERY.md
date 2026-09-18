# OmniEdu — Backup & Disaster Recovery (DR) Runbook

## 1. RPO and RTO Commitments
- **Recovery Point Objective (RPO)**: <= 1 Hour (maximum acceptable data loss in catastrophic disaster).
- **Recovery Time Objective (RTO)**: <= 30 Minutes (maximum target time to restore full platform availability).

## 2. Automated Snapshot Backup Script
OmniEdu includes an automated database export script (`server/scripts/backup-database.ts`) that produces serialized JSON snapshots of all multi-tenant tables, accompanied by a cryptographically verifiable SHA-256 integrity checksum manifest.

### 2.1 Generating a Backup
```bash
# From server/ directory
npx tsx scripts/backup-database.ts
```
Output:
```
Database snapshot saved to: backups/backup-2026-09-10T14-41-00-123Z.json
Integrity checksum: 8f3c4e92a...
Total tables backed up: 18
```

### 2.2 Backup Integrity Manifest
Every backup generates a `.sha256` digest file. Before any restore procedure, verify the integrity:
```bash
sha256sum -c backups/backup-2026-09-10T14-41-00-123Z.json.sha256
```

## 3. PostgreSQL Native Physical & Logical Backups
In cloud production (AWS RDS / GCP Cloud SQL / Bare Metal):

### 3.1 Automated Daily pg_dump
```bash
# Automated cron job running every 4 hours:
0 */4 * * * pg_dump -U $POSTGRES_USER -Fc $POSTGRES_DB > /mnt/backups/omniedu_$(date +\%Y\%m\%d_\%H\%M\%S).dump
```

### 3.2 S3 / Cloud Storage Synchronization
Encrypted off-site sync to AWS S3 / GCP Cloud Storage with bucket versioning and object locks:
```bash
aws s3 sync /mnt/backups/ s3://omniedu-dr-backups/pg-dumps/ --sse aws:kms
```

## 4. Disaster Recovery Restoration Procedure
In the event of database failure or corrupted state:
1. **Provision New DB Instance**: Initialize fresh PostgreSQL 16 container or cloud instance.
2. **Restore Schema**:
   ```bash
   npx prisma db push --skip-generate
   ```
3. **Execute Snapshot Restore**:
   ```bash
   pg_restore -U $POSTGRES_USER -d $POSTGRES_DB -v /mnt/backups/latest.dump
   ```
4. **Run Smoke Tests**: Execute `npx tsx scripts/keep-alive-ping.ts` and verify `/api/health/ready` returns `200 OK` with database status `healthy`.
