import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../config/logger';
import { metricsRegistry } from '../config/metrics';
import { tracer } from '../config/tracer';
import { requestContextStorage, RequestContext } from './requestCorrelation';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      startTime?: number;
    }
  }
}

// Backwards-compatible in-memory metrics accessor
export const apiMetrics = {
  get totalRequests() {
    return metricsRegistry.totalRequests;
  },
  get activeRequests() {
    return metricsRegistry.activeRequests;
  },
  get requestsByStatus() {
    return metricsRegistry.requestsByStatus;
  },
  get requestsByMethod() {
    return metricsRegistry.requestsByMethod;
  },
  get totalResponseTimeMs() {
    return metricsRegistry.dbQueryDurationSumMs; // backwards compat proxy
  },
  startTime: Date.now(),
};

export function requestTracing(req: Request, res: Response, next: NextFunction) {
  const incomingReqId = (req.headers['x-request-id'] as string) || (req.headers['x-correlation-id'] as string);
  const reqId = incomingReqId && incomingReqId.trim() !== '' ? incomingReqId.trim() : crypto.randomUUID();
  const traceId = (req.headers['x-trace-id'] as string) || crypto.randomBytes(16).toString('hex');
  const spanId = crypto.randomBytes(8).toString('hex');
  const startTime = Date.now();

  req.id = reqId;
  req.startTime = startTime;
  res.setHeader('X-Request-Id', reqId);
  res.setHeader('X-Trace-Id', traceId);

  metricsRegistry.activeRequests++;

  const context: RequestContext = {
    requestId: reqId,
    traceId,
    spanId,
    startTime,
    institutionId: (req.headers['x-institution-id'] as string) || req.selectedInstitutionId,
    userId: req.user?.id,
  };

  requestContextStorage.run(context, () => {
    const span = tracer.startSpan(`HTTP ${req.method} ${req.baseUrl || req.path}`, {
      method: req.method,
      path: req.originalUrl || req.path,
    });

    res.on('finish', () => {
      const duration = req.startTime ? Date.now() - req.startTime : 0;
      const routePath = req.route?.path ? `${req.baseUrl || ''}${req.route.path}` : req.path;

      metricsRegistry.recordHttpRequest(req.method, routePath, res.statusCode, duration);
      tracer.endSpan(span, res.statusCode >= 500 ? 'ERROR' : 'OK');

      // Log if not root liveness probe or if status >= 400
      if ((!req.path.startsWith('/health/live') && !req.path.startsWith('/api/health/live')) || res.statusCode >= 400) {
        const logPayload = {
          requestId: req.id,
          traceId,
          method: req.method,
          path: req.originalUrl || req.path,
          statusCode: res.statusCode,
          durationMs: duration,
          institutionId: context.institutionId,
          userId: req.user?.id,
          ip: req.ip,
        };

        if (res.statusCode >= 500) {
          logger.error(logPayload, 'Server Error Request');
        } else if (res.statusCode >= 400) {
          logger.warn(logPayload, 'Client Error Request');
        } else {
          logger.info(logPayload, 'Request Handled');
        }
      }
    });

    next();
  });
}
