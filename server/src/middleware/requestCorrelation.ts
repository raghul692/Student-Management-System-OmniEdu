import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';

export interface RequestContext {
  requestId: string;
  traceId: string;
  spanId: string;
  startTime: number;
  userId?: string;
  institutionId?: string;
  organizationId?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function getRequestId(): string {
  const ctx = requestContextStorage.getStore();
  return ctx?.requestId || 'req-untracked';
}

export function getTraceId(): string {
  const ctx = requestContextStorage.getStore();
  return ctx?.traceId || 'trace-untracked';
}

/**
 * PII redaction utility to ensure passwords, tokens, Aadhaar, PAN,
 * and card numbers are never stored in log records.
 */
export function sanitizeLogPayload(data: any): any {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeLogPayload);
  }

  const sanitized: Record<string, any> = {};
  const sensitiveKeys = new Set([
    'password',
    'pass',
    'token',
    'accesstoken',
    'refreshtoken',
    'authorization',
    'cookie',
    'secret',
    'jwt_access_secret',
    'jwt_refresh_secret',
    'gemini_api_key',
    'openai_api_key',
    'creditcard',
    'cardnumber',
    'aadhaar',
    'pan',
  ]);

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'aadhaar') {
      sanitized[key] = '[REDACTED_AADHAAR]';
    } else if (lowerKey === 'pan') {
      sanitized[key] = '[REDACTED_PAN]';
    } else if (lowerKey === 'creditcard' || lowerKey === 'cardnumber') {
      sanitized[key] = '[REDACTED_CARD]';
    } else if (sensitiveKeys.has(lowerKey)) {
      sanitized[key] = '[REDACTED_SECURITY_SECRET]';
    } else if (typeof value === 'string') {
      // Regex check for Aadhaar (12 digits) or Card (16 digits)
      let strVal = value;
      if (/\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/.test(strVal)) {
        strVal = strVal.replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, '[REDACTED_AADHAAR]');
      }
      if (/\b[A-Z]{5}[0-9]{4}[A-Z]\b/.test(strVal)) {
        strVal = strVal.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, '[REDACTED_PAN]');
      }
      if (/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/.test(strVal)) {
        strVal = strVal.replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, '[REDACTED_CARD]');
      }
      sanitized[key] = strVal;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogPayload(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Express middleware to attach correlation ID, trace ID, and run handler in AsyncLocalStorage scope.
 */
export function requestCorrelationMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingReqId = (req.headers['x-request-id'] as string) || (req.headers['x-correlation-id'] as string);
  const requestId = incomingReqId && incomingReqId.trim() !== '' ? incomingReqId.trim() : crypto.randomUUID();
  const traceId = (req.headers['x-trace-id'] as string) || crypto.randomBytes(16).toString('hex');
  const spanId = crypto.randomBytes(8).toString('hex');
  const startTime = Date.now();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Trace-Id', traceId);

  const context: RequestContext = {
    requestId,
    traceId,
    spanId,
    startTime,
    institutionId: req.headers['x-institution-id'] as string,
  };

  requestContextStorage.run(context, () => {
    next();
  });
}
