import crypto from 'crypto';
import { getRequestContext, requestContextStorage } from '../middleware/requestCorrelation';
import { logger } from './logger';

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes: Record<string, any>;
  status: 'OK' | 'ERROR';
  error?: string;
}

class InProcessTracer {
  private activeSpans: Map<string, Span> = new Map();
  private completedSpans: Span[] = [];
  private maxCompletedHistory = 500;

  /**
   * Start a new logical trace span.
   */
  public startSpan(name: string, attributes: Record<string, any> = {}): Span {
    const ctx = getRequestContext();
    const traceId = ctx?.traceId || crypto.randomBytes(16).toString('hex');
    const parentSpanId = ctx?.spanId;
    const spanId = crypto.randomBytes(8).toString('hex');

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      startTime: Date.now(),
      attributes: {
        ...attributes,
        requestId: ctx?.requestId,
        institutionId: ctx?.institutionId,
      },
      status: 'OK',
    };

    this.activeSpans.set(spanId, span);
    return span;
  }

  /**
   * End a span and record duration.
   */
  public endSpan(span: Span, status: 'OK' | 'ERROR' = 'OK', error?: string): void {
    const now = Date.now();
    span.endTime = now;
    span.durationMs = Math.max(0, now - span.startTime);
    span.status = status;
    if (error) span.error = error;

    this.activeSpans.delete(span.spanId);
    this.completedSpans.push(span);

    if (this.completedSpans.length > this.maxCompletedHistory) {
      this.completedSpans.shift();
    }

    if (status === 'ERROR') {
      logger.warn(
        {
          traceId: span.traceId,
          spanId: span.spanId,
          spanName: span.name,
          durationMs: span.durationMs,
          error,
        },
        `Trace Span [${span.name}] Failed`
      );
    }
  }

  /**
   * Helper to wrap an async block with automatic span measurement.
   */
  public async traceAsync<T>(
    name: string,
    attributes: Record<string, any>,
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    const span = this.startSpan(name, attributes);
    try {
      const result = await fn(span);
      this.endSpan(span, 'OK');
      return result;
    } catch (err: any) {
      this.endSpan(span, 'ERROR', err.message);
      throw err;
    }
  }

  /**
   * Get recent spans for diagnostics / testing.
   */
  public getRecentSpans(limit = 50): Span[] {
    return this.completedSpans.slice(-limit);
  }

  public clear(): void {
    this.activeSpans.clear();
    this.completedSpans = [];
  }
}

export const tracer = new InProcessTracer();
