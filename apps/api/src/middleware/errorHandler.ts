import type { Request, Response, NextFunction } from 'express';
import type { ErrorCode, ErrorResponse } from '@nomad/shared';

export class AppError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'));
}

// Every error leaves the API as { error: { code, message, fields? } }.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    const body: ErrorResponse = {
      error: { code: err.code, message: err.message, fields: err.fields },
    };
    return res.status(err.status).json(body);
  }
  console.error(err);
  const body: ErrorResponse = { error: { code: 'INTERNAL', message: 'Something went wrong' } };
  res.status(500).json(body);
}
