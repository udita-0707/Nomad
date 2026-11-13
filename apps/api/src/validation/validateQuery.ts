import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

// Same as validateBody, for req.query. On failure returns 400 VALIDATION_ERROR
// with a fields map like { minStars: 'Stars must be 1 to 5' }.
export const validateQuery =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (result.success) {
      req.query = result.data;
      return next();
    }
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) fields[issue.path.join('.')] ??= issue.message;
    next(new AppError(400, 'VALIDATION_ERROR', 'Invalid query string', fields));
  };
