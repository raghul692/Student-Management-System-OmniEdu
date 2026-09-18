import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

function createCustomLimitHandler(policyName: string, windowMinutes: number) {
  return (req: Request, res: Response) => {
    const retryAfter = res.getHeader('Retry-After') || windowMinutes * 60;
    res.status(429).json({
      status: 'fail',
      code: 'RATE_LIMIT_EXCEEDED',
      policy: policyName,
      message: `Too many requests for ${policyName}. Please wait ${windowMinutes} minutes before retrying.`,
      retryAfterSeconds: Number(retryAfter) || windowMinutes * 60,
      requestId: req.id || req.headers['x-request-id'] || 'req-untracked',
      timestamp: new Date().toISOString(),
    });
  };
}

const isTest = process.env.NODE_ENV === 'test';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createCustomLimitHandler('General API', 15),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 5000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createCustomLimitHandler('Authentication', 15),
});

export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 5000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createCustomLimitHandler('AI Platform', 15),
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 5000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createCustomLimitHandler('File Upload', 15),
});

export const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 5000 : 40,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createCustomLimitHandler('Analytics & Reports', 15),
});
