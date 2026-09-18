# OmniEdu Unified Educational ERP — Webhook Events & Integration Reference

This document provides technical documentation for registering, signing, and consuming real-time HTTP webhooks dispatched by the OmniEdu integration engine.

---

## 1. Webhook Signature Verification

All HTTP POST webhook requests include the following authentication headers:

| Header | Description | Example |
| :--- | :--- | :--- |
| `X-OmniEdu-Event` | The event topic identifier | `STUDENT_ENROLLED` |
| `X-OmniEdu-Delivery` | Unique delivery UUID | `d4e5f6a7-1234-5678-90ab-cdef12345678` |
| `X-OmniEdu-Signature` | HMAC-SHA256 signature formatted as `sha256=<hex>` | `sha256=a1b2c3d4e5f6...` |
| `User-Agent` | System dispatch identifier | `OmniEdu-Webhooks/2.0` |

### Verifying Signatures in Node.js

```typescript
import crypto from 'crypto';

export function verifyWebhook(rawBody: string, signatureHeader: string, secret: string): boolean {
  const [algo, signature] = signatureHeader.split('=');
  if (algo !== 'sha256') return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

---

## 2. Event Catalog

### `STUDENT_ENROLLED`
Fired whenever a student is enrolled into an academic class or course offering.

```json
{
  "event": "STUDENT_ENROLLED",
  "institutionId": "inst_123",
  "timestamp": "2026-09-10T12:00:00.000Z",
  "data": {
    "studentId": "std_456",
    "fullName": "Kavitha R",
    "regNumber": "910021104045",
    "departmentCode": "CSE",
    "academicYear": "2025-2026"
  }
}
```

### `ATTENDANCE_DEFICIT`
Fired when student attendance falls below the regulatory condonation threshold.

```json
{
  "event": "ATTENDANCE_DEFICIT",
  "institutionId": "inst_123",
  "timestamp": "2026-09-10T12:05:00.000Z",
  "data": {
    "studentId": "std_456",
    "currentPercentage": 68.5,
    "threshold": 75.0,
    "totalHours": 120,
    "presentHours": 82
  }
}
```

### `EXAM_MARKS_POSTED`
Fired when examination marks are committed by faculty.

```json
{
  "event": "EXAM_MARKS_POSTED",
  "institutionId": "inst_123",
  "timestamp": "2026-09-10T12:10:00.000Z",
  "data": {
    "examId": "ex_789",
    "examType": "IAT_1",
    "courseCode": "CS8501",
    "recordsCommitted": 64
  }
}
```

### `FEE_PAYMENT_COLLECTED`
Fired when tuition or facility fee payment is recorded.

```json
{
  "event": "FEE_PAYMENT_COLLECTED",
  "institutionId": "inst_123",
  "timestamp": "2026-09-10T12:15:00.000Z",
  "data": {
    "paymentId": "pay_999",
    "receiptNumber": "REC-2026-0042",
    "amountPaid": 45000,
    "studentId": "std_456",
    "paymentMethod": "ONLINE"
  }
}
```
