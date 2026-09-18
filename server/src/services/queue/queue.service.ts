import crypto from 'crypto';
import { logger } from '../../config/logger';
import { metricsRegistry } from '../../config/metrics';
import { getRequestId } from '../../middleware/requestCorrelation';

export type JobType =
  | 'REPORT_GENERATION'
  | 'BULK_STUDENT_IMPORT'
  | 'ATTENDANCE_DEF_ALERT'
  | 'NOTIFICATION_DISPATCH'
  | 'AI_INDEXING'
  | 'EMAIL_DISPATCH';

export type JobStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER';

export interface JobOptions {
  attempts?: number;
  backoffMs?: number;
  delayMs?: number;
  priority?: number;
  idempotencyKey?: string;
  correlationId?: string;
}

export interface JobRecord<T = any> {
  id: string;
  type: JobType;
  data: T;
  status: JobStatus;
  progress: number; // 0 - 100
  attemptsMade: number;
  maxAttempts: number;
  backoffMs: number;
  idempotencyKey?: string;
  correlationId?: string;
  error?: string;
  result?: any;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

type JobProcessor = (job: JobRecord) => Promise<any>;

class QueueService {
  private jobs: Map<string, JobRecord> = new Map();
  private processors: Map<JobType, JobProcessor> = new Map();
  private idempotencyIndex: Map<string, string> = new Map(); // idempotencyKey -> jobId
  private queue: string[] = []; // Job IDs pending execution
  private isProcessing = false;
  private isShuttingDown = false;
  private maxConcurrency = 3;
  private activeWorkers = 0;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.startConsumer();
  }

  private startConsumer() {
    if (!this.timer) {
      this.timer = setInterval(() => this.processNext(), 200);
      this.timer.unref();
    }
  }

  /**
   * Register a processor function for a given job type.
   */
  public registerProcessor(type: JobType, processor: JobProcessor) {
    this.processors.set(type, processor);
    logger.info({ type }, `Queue processor registered for ${type}`);
  }

  /**
   * Enqueue a job for background processing with idempotency support.
   */
  public async enqueueJob<T>(type: JobType, data: T, options?: JobOptions): Promise<JobRecord<T>> {
    if (this.isShuttingDown) {
      throw new Error('Queue is currently shutting down. Cannot accept new jobs.');
    }

    // 1. Idempotency Check: Return existing job if active or recently completed
    if (options?.idempotencyKey) {
      const existingJobId = this.idempotencyIndex.get(options.idempotencyKey);
      if (existingJobId) {
        const existingJob = this.jobs.get(existingJobId);
        if (existingJob && existingJob.status !== 'FAILED') {
          logger.info(
            { jobId: existingJob.id, type, idempotencyKey: options.idempotencyKey },
            'Idempotent job hit: returning existing background job without duplication.'
          );
          return existingJob as JobRecord<T>;
        }
      }
    }

    const id = `job_${crypto.randomUUID()}`;
    const correlationId = options?.correlationId || getRequestId();

    const job: JobRecord<T> = {
      id,
      type,
      data,
      status: 'PENDING',
      progress: 0,
      attemptsMade: 0,
      maxAttempts: options?.attempts || 3,
      backoffMs: options?.backoffMs || 1000,
      idempotencyKey: options?.idempotencyKey,
      correlationId,
      createdAt: new Date(),
    };

    this.jobs.set(id, job);

    if (options?.idempotencyKey) {
      this.idempotencyIndex.set(options.idempotencyKey, id);
    }

    if (options?.delayMs && options.delayMs > 0) {
      setTimeout(() => {
        if (!this.isShuttingDown) {
          this.queue.push(id);
        }
      }, options.delayMs);
    } else {
      this.queue.push(id);
    }

    logger.info({ jobId: id, type, correlationId }, `Job ${id} queued for ${type}`);
    return job;
  }

  /**
   * Query status of a job by ID.
   */
  public getJob(id: string): JobRecord | undefined {
    return this.jobs.get(id);
  }

  /**
   * Update progress for a running job.
   */
  public updateProgress(id: string, progress: number) {
    const job = this.jobs.get(id);
    if (job && job.status === 'ACTIVE') {
      job.progress = Math.min(100, Math.max(0, progress));
    }
  }

  /**
   * Internal queue consumer worker
   */
  private async processNext() {
    if (this.isProcessing || this.isShuttingDown || this.activeWorkers >= this.maxConcurrency) return;
    if (this.queue.length === 0) return;

    const jobId = this.queue.shift();
    if (!jobId) return;

    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'PENDING') return;

    const processor = this.processors.get(job.type);
    if (!processor) {
      logger.warn({ jobId, type: job.type }, `No processor registered for job type ${job.type}`);
      job.status = 'FAILED';
      job.error = `No processor registered for job type ${job.type}`;
      return;
    }

    this.activeWorkers++;
    job.status = 'ACTIVE';
    job.startedAt = new Date();
    job.attemptsMade++;

    const startExecution = Date.now();

    try {
      const result = await processor(job);
      job.status = 'COMPLETED';
      job.progress = 100;
      job.result = result;
      job.finishedAt = new Date();

      const durationMs = Date.now() - startExecution;
      metricsRegistry.recordQueueJob(job.type, 'COMPLETED', durationMs);

      logger.info(
        { jobId, type: job.type, correlationId: job.correlationId, durationMs },
        `Job ${jobId} completed successfully`
      );
    } catch (err: any) {
      const durationMs = Date.now() - startExecution;
      logger.error(
        { jobId, type: job.type, correlationId: job.correlationId, error: err.message, attempts: job.attemptsMade },
        `Job ${jobId} execution failed`
      );

      if (job.attemptsMade < job.maxAttempts && !this.isShuttingDown) {
        // Retry with exponential backoff
        job.status = 'PENDING';
        const delay = job.backoffMs * Math.pow(2, job.attemptsMade - 1);
        setTimeout(() => {
          if (!this.isShuttingDown) {
            this.queue.push(job.id);
          }
        }, delay);
      } else {
        // Transition to Dead-Letter state
        job.status = 'DEAD_LETTER';
        job.error = err.message || 'Job processing failed after max retries';
        job.finishedAt = new Date();
        metricsRegistry.recordQueueJob(job.type, 'FAILED', durationMs);

        logger.warn(
          { jobId, type: job.type, correlationId: job.correlationId, error: job.error },
          `Job ${jobId} moved to Dead-Letter Queue (DLQ)`
        );
      }
    } finally {
      this.activeWorkers = Math.max(0, this.activeWorkers - 1);
    }
  }

  /**
   * Inspect all Dead-Letter Queue (DLQ) jobs.
   */
  public getDeadLetterJobs(): JobRecord[] {
    return Array.from(this.jobs.values()).filter((j) => j.status === 'DEAD_LETTER');
  }

  /**
   * Manually retry a Dead-Letter Queue job.
   */
  public retryDeadLetterJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'DEAD_LETTER') return false;

    job.status = 'PENDING';
    job.attemptsMade = 0;
    job.error = undefined;
    this.queue.push(job.id);
    logger.info({ jobId }, `Job ${jobId} re-queued from Dead-Letter Queue`);
    return true;
  }

  /**
   * Gracefully drain active jobs and stop accepting new ones.
   */
  public async drainAndStop(timeoutMs = 5000): Promise<void> {
    this.isShuttingDown = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    const start = Date.now();
    logger.info({ activeWorkers: this.activeWorkers }, 'Draining background queue workers for graceful shutdown...');

    while (this.activeWorkers > 0 && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.activeWorkers > 0) {
      logger.warn({ remainingWorkers: this.activeWorkers }, 'Queue shutdown timeout reached with active workers.');
    } else {
      logger.info('Queue successfully drained with 0 active workers.');
    }
  }

  /**
   * Resume queue consumer (used in tests or restarts).
   */
  public resume(): void {
    this.isShuttingDown = false;
    this.startConsumer();
  }

  /**
   * Get queue statistics.
   */
  public getStats() {
    let pending = 0;
    let active = 0;
    let completed = 0;
    let failed = 0;
    let deadLetter = 0;

    for (const job of this.jobs.values()) {
      if (job.status === 'PENDING') pending++;
      else if (job.status === 'ACTIVE') active++;
      else if (job.status === 'COMPLETED') completed++;
      else if (job.status === 'FAILED') failed++;
      else if (job.status === 'DEAD_LETTER') deadLetter++;
    }

    return {
      total: this.jobs.size,
      queuedInLine: this.queue.length,
      pending,
      active: this.activeWorkers,
      completed,
      failed,
      deadLetter,
      maxConcurrency: this.maxConcurrency,
      isShuttingDown: this.isShuttingDown,
    };
  }

  /**
   * Clean up old completed jobs (retention policy).
   */
  public cleanup(maxAgeMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [id, job] of this.jobs.entries()) {
      if (job.finishedAt && now - job.finishedAt.getTime() > maxAgeMs) {
        if (job.idempotencyKey) {
          this.idempotencyIndex.delete(job.idempotencyKey);
        }
        this.jobs.delete(id);
      }
    }
  }

  public clear(): void {
    this.jobs.clear();
    this.queue = [];
    this.idempotencyIndex.clear();
  }
}

export const queueService = new QueueService();
