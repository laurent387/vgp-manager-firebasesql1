import { ErrorHandler } from 'hono';
import { logger } from './logger';
import { isProduction } from '../config/env';

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, any>;
}

export class AppError extends Error implements ApiError {
  code: string;
  statusCode: number;
  details?: Record<string, any>;

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get('requestId') || 'unknown';
  
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, {
      requestId,
      code: err.code,
      statusCode: err.statusCode,
    });
    
    return c.json({
      error: {
        message: err.message,
        code: err.code,
        ...(err.details && !isProduction() && { details: err.details }),
      },
    }, err.statusCode as any);
  }
  
  logger.error(`Unhandled error: ${err.message}`, {
    requestId,
    stack: err.stack,
    name: err.name,
  });
  
  return c.json({
    error: {
      message: isProduction() ? 'Internal server error' : err.message,
      code: 'INTERNAL_SERVER_ERROR',
      ...(!isProduction() && { stack: err.stack }),
    },
  }, 500);
};
