import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { SESSION_COOKIE, getValidSession } from '../services/session.js';
import type { User } from '../db/schema.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

// Reads the session cookie, validates the session and attaches req.user.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const sid = req.cookies?.[SESSION_COOKIE];
    const user = sid ? await getValidSession(sid) : null;
    if (!user) return next(new AppError(401, 'UNAUTHENTICATED', 'Not signed in'));
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
