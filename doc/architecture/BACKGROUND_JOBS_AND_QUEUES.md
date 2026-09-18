# OmniEdu — Asynchronous Background Jobs & Queue Architecture

## 1. Design Rationale
Time-consuming operations such as transactional email delivery, bulk report rendering (PDF/Excel), and batch notification fan-outs must not execute inside the synchronous HTTP request cycle. OmniEdu incorporates an event-driven background job execution engine (`QueueService`).

```mermaid
graph LR
    API["Express HTTP Route"] -->|queueService.add(type, payload)| Queue["FIFO Memory Job Queue"]
    Queue -->|Process concurrent slots| WorkerPool["Worker Pool (Concurrency: 5)"]
    WorkerPool -->|Job Handlers| Handlers{"Job Dispatcher"}
    Handlers -->|email.send| EmailWorker["Email Service"]
    Handlers -->|notification.create| NotifWorker["In-App Notifications"]
    Handlers -->|pdf.generate| ReportWorker["Report Engine"]
    WorkerPool -->|Success| Completed["Job Completed State"]
    WorkerPool -->|Failure| RetryLogic{"Attempt < 3?"}
    RetryLogic -->|Yes| Backoff["Exponential Backoff Retry"] --> Queue
    RetryLogic -->|No| Failed["Dead Letter / Failed State"]
```

## 2. Queue Mechanics
- **Queue Engine**: `server/src/services/queue/queue.service.ts`
- **Supported Job Types**:
  - `email.send`: Delivers transactional alerts (attendance warnings, fee receipts, welcome emails).
  - `notification.create`: Dispatches in-app alerts and mobile push notifications.
  - `report.generate`: Asynchronously compiles batch PDFs and data exports.
  - `student.bulk-import`: Parses CSV batches without socket timeouts.

## 3. Resilience & Concurrency
- **Concurrency**: Up to 5 parallel jobs processed simultaneously.
- **Retry Strategy**: 3 attempts with exponential backoff (`delay = 1000ms * 2^(attempt - 1)`).
- **Error Capture**: Failure stacks and retry counts are logged with structured contextual tags via Pino.
- **Monitoring**: Queue health, active workers, pending jobs, and completed statistics are available programmatically via `queueService.getStats()`.

## 4. Example Usage
```typescript
import { queueService } from '../../services/queue/queue.service';

// Inside business logic service
await queueService.add('email.send', {
  to: student.email,
  subject: 'Fee Payment Received - Receipt #REC-2026-001',
  html: receiptTemplateHtml,
});
```
