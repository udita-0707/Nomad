import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { SESSION_COOKIE, getSessionUser } from '../services/session.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try { const sessionId = req.cookies[SESSION_COOKIE]; const user = sessionId ? await getSessionUser(sessionId) : null; if (!user) return next(new AppError(401, 'UNAUTHENTICATED', 'Not signed in')); res.locals.user = user; next(); } catch (error) { next(error); }
}
