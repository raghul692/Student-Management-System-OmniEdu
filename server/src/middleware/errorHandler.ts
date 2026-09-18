import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../config/logger';
import { getRequestId } from './requestCorrelation';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public details?: any,
    public code: string = 'APPLICATION_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = (req.id || getRequestId()) || 'req-unknown';
  const timestamp = new Date().toISOString();

  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'fail',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      requestId,
      timestamp,
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // 2. Known Prisma Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        status: 'fail',
        code: 'DUPLICATE_RESOURCE',
        message: 'A record with this unique value already exists.',
        target: err.meta?.target,
        requestId,
        timestamp,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        status: 'fail',
        code: 'RESOURCE_NOT_FOUND',
        message: 'The requested record was not found.',
        requestId,
        timestamp,
      });
    }
  }

  // 3. Custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.statusCode >= 500 ? 'error' : 'fail',
      code: err.code || (err.statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'APPLICATION_ERROR'),
      message: err.message,
      details: err.details,
      requestId,
      timestamp,
    });
  }

  // 4. Rate Limit / 429 Error
  if (err.status === 429 || err.statusCode === 429) {
    return res.status(429).json({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: err.message || 'Too many requests. Please slow down and try again later.',
      requestId,
      timestamp,
    });
  }

  // 5. Unhandled Internal Server Error
  logger.error(
    {
      requestId,
      path: req.originalUrl || req.path,
      method: req.method,
      errorName: err.name,
      errorMessage: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    },
    'Unhandled Server Exception'
  );

  const safeMessage =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error occurred. Please contact support with the request ID.'
      : err.message || 'Internal server error';

  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: safeMessage,
    requestId,
    timestamp,
  });
}
