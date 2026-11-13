import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

// Validates req.body with a schema from @nomad/shared. On failure returns
// 400 VALIDATION_ERROR with a fields map like { email: 'Invalid email' }.
export const validateBody =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (result.success) {
      req.body = result.data;
      return next();
    }
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) fields[issue.path.join('.')] ??= issue.message;
    next(new AppError(400, 'VALIDATION_ERROR', 'Invalid request body', fields));
  };
