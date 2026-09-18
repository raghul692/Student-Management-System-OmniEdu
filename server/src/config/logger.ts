import pino from 'pino';
import { getRequestContext, sanitizeLogPayload } from '../middleware/requestCorrelation';

const isDev = process.env.NODE_ENV !== 'production';

export const rawLogger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    service: 'omniedu-api',
    env: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Contextual Logger Proxy: Automatically injects current requestId, traceId,
 * and institutionId from AsyncLocalStorage execution context and strips sensitive PII.
 */
function createLogMethod(level: 'debug' | 'info' | 'warn' | 'error') {
  return (arg1: any, arg2?: string, ...rest: any[]) => {
    const ctx = getRequestContext();
    const contextMeta = ctx
      ? {
          requestId: ctx.requestId,
          traceId: ctx.traceId,
          institutionId: ctx.institutionId,
        }
      : {};

    if (typeof arg1 === 'string') {
      // logger.info("message")
      rawLogger[level](contextMeta, arg1, ...rest);
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      // logger.info({ custom: 123 }, "message")
      const sanitized = sanitizeLogPayload(arg1);
      const combined = { ...contextMeta, ...sanitized };
      rawLogger[level](combined, arg2 || '', ...rest);
    } else {
      rawLogger[level](contextMeta, String(arg1), ...rest);
    }
  };
}

export const logger = {
  debug: createLogMethod('debug'),
  info: createLogMethod('info'),
  warn: createLogMethod('warn'),
  error: createLogMethod('error'),
  child: (bindings: pino.Bindings) => rawLogger.child(sanitizeLogPayload(bindings)),
};
