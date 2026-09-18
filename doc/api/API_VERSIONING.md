# OmniEdu Unified Educational ERP — API Versioning & Backward Compatibility

This document outlines the API versioning strategy, backward-compatible `/api/v1` aliases, header conventions, and lifecycle deprecation policy.

---

## 1. Versioning Architecture

OmniEdu supports simultaneous dual routing to prevent disruptions to existing mobile clients, webhooks, and third-party integrations:

1. **Standard Modern Endpoints**: Mounted at `/api/...` (e.g. `/api/students`, `/api/attendance`, `/api/interventions`).
2. **Explicit Versioned Sub-Router**: Mounted at `/api/v1/...` (e.g. `/api/v1/students`, `/api/v1/attendance`, `/api/v1/interventions`).

Both prefixes share identical middleware, authentication semantics, and validation schemas, ensuring complete 1-to-1 backward compatibility.

---

## 2. API Response Standard

All endpoints return a standardized envelope schema:

```json
{
  "status": "success",
  "data": { ... },
  "message": "Optional human-readable feedback"
}
```

Error responses:

```json
{
  "status": "fail",
  "message": "Detailed error explanation",
  "errors": [ ... ]
}
```

---

## 3. Deprecation & Sunset Policy

- When an endpoint is marked for deprecation:
  - A `Deprecation: @<timestamp>` header is appended to responses.
  - A `Sunset: <date>` HTTP header indicates the planned decommission date.
  - The changelog in `/doc` documents migration paths and replacement route signatures.
- Non-breaking changes (additive optional parameters or new JSON response fields) are rolled out without version increment.
