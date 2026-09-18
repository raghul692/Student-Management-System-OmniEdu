# OmniEdu Unified Educational ERP — Security Architecture & Access Control

This document outlines the multi-layered security model, identity verification, Role-Based Access Control (RBAC), tenant partition isolation, and data compliance standards.

---

## 1. Security Principles & Threat Defense

1. **Zero-Trust Multi-Tenancy**:
   - Every database query through Prisma enforces strict `organizationId` and `institutionId` binding via `requireInstitutionContext()`.
   - Direct Object Reference (IDOR) protection on all endpoints: verified parent-child links, student self-access validations, and role assertions.
2. **Dual-Layer Token Authentication**:
   - **Access Token**: Short-lived (15 minutes), signed via RS256/HS256 with user ID, role, and institution scope.
   - **Refresh Token**: Long-lived (7 days), stored hashed (`tokenHash`) in PostgreSQL, with instant revocation capabilities across all active sessions.
3. **Password Security**:
   - Industry-standard bcrypt hashing with a work factor of 12. No plaintext credentials are ever logged or persisted.
4. **Rate Limiting**:
   - Sliding-window rate limiters per IP/User to prevent credential stuffing, brute force attacks, and denial-of-service on auth endpoints.

---

## 2. RBAC & Institutional Permission Matrix

| Operation / Scope | PLATFORM_ADMIN | ORG_ADMIN | INSTITUTION_ADMIN | HOD | FACULTY | CLASS_ADVISOR | STUDENT | PARENT |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Manage Organizations** | Full | Self | None | None | None | None | None | None |
| **Provision Campuses** | Full | Full | Read-only | None | None | None | None | None |
| **Faculty & Staff** | Full | Full | Full | Read/Dept | Read | Read | None | None |
| **Attendance Entry** | Full | Full | Full | Dept | Assigned | Assigned | None | None |
| **Marks Entry & CIA** | Full | Full | Full | Dept | Assigned | Assigned | None | None |
| **Publish Regulations** | Full | Full | Full | None | None | None | None | None |
| **Remedial Interventions**| Full | Full | Full | Dept | Read/Write | Read/Write | Self View | Ward View |
| **Webhook Outbox** | Full | Full | Full | None | None | None | None | None |
| **Export Audit Logs** | Full | Full | Full | None | None | None | None | None |
| **Student 360° Dossier** | Full | Full | Full | Dept | Assigned | Assigned | Self Only | Ward Only |

---

## 3. FERPA & GDPR Compliance Controls

- **Right to Access (Data Portability)**:
  - Students and parents can initiate personal data archive requests via `POST /api/privacy/export-request`.
  - Generates an encrypted export of demographic data, academic transcripts, attendance logs, and fee receipts.
- **Right to Erasure (Deactivation)**:
  - Account deactivation via `POST /api/privacy/deactivate` immediately revokes all active refresh tokens, masks non-regulatory personal identifiable information (PII), and creates an immutable audit log record.
