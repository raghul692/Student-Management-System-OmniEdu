# OmniEdu — RESTful API Specification & Developer Guide

## 1. Protocol & Conventions
- **Base URL**: `/api`
- **Transport**: HTTPS with TLS 1.3
- **Format**: JSON (`Content-Type: application/json`)
- **Authentication**: Bearer JWT (`Authorization: Bearer <token>`)
- **Tenant Scoping Headers**:
  - `x-institution-id`: Target campus identifier (Required for campus-level operations)
  - `x-organization-id`: Target trust identifier (Used for organization-level administration)
  - `X-Request-Id`: Optional distributed request correlation token (Echoed back in response headers)

## 2. Standardized Response Format
All API responses strictly adhere to the unified envelope structure:

### Success Response (`200 OK`, `201 Created`):
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 120,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "message": "Operation completed successfully"
}
```

### Error Response (`400`, `401`, `403`, `404`, `429`, `500`):
```json
{
  "success": false,
  "error": {
    "code": 403,
    "message": "Forbidden. Insufficient permissions for requested resource."
  }
}
```

## 3. Core Endpoint Catalog

### 3.1 Authentication & Sessions (`/api/auth`)
| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticate user via email + password |
| `POST` | `/api/auth/demo-login` | Public | Instant persona switcher for authorized demo roles |
| `POST` | `/api/auth/refresh` | Public | Rotate refresh token and issue new access token |
| `POST` | `/api/auth/logout` | Public | Invalidate current refresh token nonce |
| `POST` | `/api/auth/revoke-all`| Bearer | Invalidate all sessions across devices for current user |
| `GET`  | `/api/auth/me` | Bearer | Fetch profile, memberships, and active context |
| `POST` | `/api/auth/select-institution` | Bearer | Switch active institution context token |

### 3.2 Students & Academic Records (`/api/students`)
| Method | Path | Scopes | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/students` | Institution | Paginated, filtered list of students |
| `GET` | `/api/students/:id` | Institution | Student profile, admissions, guardian details |
| `POST` | `/api/students` | Admin/HOD | Enroll student manually |
| `PATCH` | `/api/students/:id` | Admin/HOD | Update student demographics |

### 3.3 Attendance Lifecycle (`/api/attendance`)
| Method | Path | Scopes | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/attendance/mark` | Faculty | Batch mark daily attendance |
| `GET` | `/api/attendance/defaulters` | Institution | Fetch students below attendance thresholds |
| `GET` | `/api/attendance/ledger` | Institution | Date range attendance ledger |

### 3.4 Examination & Marks (`/api/marks`)
| Method | Path | Scopes | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/marks/exams` | Institution | List examination sessions |
| `POST` | `/api/marks/entry` | Faculty | Batch grade entry |
| `POST` | `/api/marks/exam/:id/hall-tickets/generate` | Admin | Generate HMAC-SHA256 signed hall-tickets |
| `GET` | `/api/marks/hall-tickets/verify/:token` | Public | Cryptographic QR ticket verification |

### 3.5 Fees & Financials (`/api/fees`)
| Method | Path | Scopes | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/fees/structures` | Admin | Define institutional fee categories and schedules |
| `POST` | `/api/fees/assign` | Admin | Assign fee structures to students |
| `POST` | `/api/fees/payments` | Admin | Record fee collection, generate receipt # |
| `GET` | `/api/fees/students/:id` | Scoped | Fetch student ledger (Student/Parent/Admin) |

### 3.6 SaaS Subscriptions & Feature Flags (`/api/saas`)
| Method | Path | Scopes | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/saas/subscription` | Org Admin | Fetch active plan, limits, and utilization |
| `POST` | `/api/saas/subscription/upgrade` | Org Admin | Upgrade plan tier (BASIC, PRO, ENTERPRISE) |
| `GET` | `/api/saas/features` | Org Admin | List tenant-specific feature flag states |
| `POST` | `/api/saas/features/:key` | Org Admin | Set custom feature flag override |

### 3.7 AI Infrastructure (`/api/ai`)
| Method | Path | Scopes | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/summary` | Institution | Generate student progress summary (PII-redacted) |
| `GET` | `/api/ai/usage` | Org Admin | Fetch token metrics and invocation audit logs |

### 3.8 Secure Storage & Cloud Streaming (`/api/storage`)
| Method | Path | Scopes | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/storage/stream` | Public (Signed) | Stream file via HMAC-SHA256 signed token |

### 3.9 Observability & Probes (`/api/metrics`, `/api/health`)
| Method | Path | Scopes | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health/live` | Public | Process liveness check |
| `GET` | `/api/health/ready` | Public | Database readiness probe |
| `GET` | `/api/metrics` | Public / Scraper | Prometheus text-based metric output |
