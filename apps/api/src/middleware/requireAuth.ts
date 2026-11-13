import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

// TODO: read req.cookies[SESSION_COOKIE], look up the session with getSessionUser,
// set res.locals.user and call next(). Otherwise throw 401 UNAUTHENTICATED.
export function requireAuth(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(401, 'UNAUTHENTICATED', 'Not signed in'));
}
