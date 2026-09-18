# OmniEdu Unified Educational ERP — Trust & Institution Admin Console Guide

This manual covers daily administrative operations, multi-campus governance, security auditing, webhook dispatch monitoring, and system telemetry for Institutional Administrators.

---

## 1. Multi-Campus Navigation & Facility Management

Institutional Admins (`ORG_ADMIN` and `INSTITUTION_ADMIN`) can seamlessly monitor and switch across autonomous campuses:

- **Campus Directory (`/app/admin/institutions`)**:
  - View all active colleges and schools under the trust.
  - Inspect affiliation details, campus codes, standard ranges, and active status.
  - Provision new campuses on demand with default academic structures.
- **Active Campus Switcher**:
  - Click **Switch Campus** on any campus card or use the header campus dropdown.
  - The entire UI, telemetry, and permission context instantly recalibrates to the selected institution without requiring re-authentication.

---

## 2. Remedial Interventions Hub (`/app/interventions`)

The Intervention Center allows academic leadership to intervene proactively for struggling students:

1. **Creating Interventions**:
   - Filter by severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and type (`ACADEMIC`, `ATTENDANCE`, `BEHAVIORAL`, `FINANCIAL`).
   - Assign a designated staff mentor and define measurable milestones.
2. **Mentorship & Case Notes**:
   - Threaded commentary between class advisors, counselors, and HODs.
   - Status transitions (`OPEN` → `IN_PROGRESS` → `RESOLVED` / `CLOSED`).
3. **Auditability**:
   - All intervention notes, status changes, and assigned mentors are permanently timestamped in the audit trail.

---

## 3. Security & Audit Trail (`/app/audit`)

OmniEdu maintains an immutable append-only audit log of all system interactions:

- **Filtering & Search**:
  - Filter by action keywords (`USER_LOGIN`, `CSV_IMPORTED`, `SETTINGS_UPDATED`, `STUDENT_DEACTIVATED`).
  - Filter by entity type (`Student`, `MarkRecord`, `InstitutionSetting`, `User`).
  - Date range filtering (`from` / `to`).
- **Inspection**:
  - Click **Inspect** to view the full JSON payload, client IP address, and actor metadata.
- **Exporting Logs (Enterprise)**:
  - Click **Export Logs** to download an authenticated JSON audit file for regulatory compliance checks.

---

## 4. Webhook Outbox & Integration Engine (`/app/webhooks`)

Integrate OmniEdu events with third-party ERPs, LMS platforms (Canvas, Moodle), or custom data warehouses:

- **Register Endpoint**:
  - Specify endpoint URL, description, and subscribed events (`STUDENT_ENROLLED`, `ATTENDANCE_DEFICIT`, `EXAM_MARKS_POSTED`, `FEE_PAYMENT_COLLECTED`).
  - The secret is generated and displayed once with an HMAC-SHA256 signing key.
- **Delivery Monitoring**:
  - Review delivery attempts, HTTP status codes, latencies, and retry logs.
  - Trigger manual ping tests or redeliver failed dispatches.

---

## 5. System Status & Infrastructure Telemetry (`/app/system/status`)

Real-time health monitoring of all infrastructure components:

- **Database Primary Cluster**: PostgreSQL connection pool status and query latency.
- **AI Inference Engine**: Gemini 1.5 Flash connectivity and local fallback status.
- **Job Queues**: Background worker queue health and concurrency metrics.
- **Object Storage**: S3/GCS asset bucket connectivity and encryption verification.
- **Privacy Governance**: FERPA/GDPR personal data archive request tracker and account deactivation tools.
