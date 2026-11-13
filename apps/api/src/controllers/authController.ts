import type { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { allocateUsername } from '../services/username.js';
import { hashPassword, verifyPassword } from '../services/password.js';
import { cookieOptions, createSession, destroySession, SESSION_COOKIE } from '../services/session.js';

function publicUser(user: typeof users.$inferSelect) { return { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt.toISOString() }; }

export async function signup(req: Request, res: Response) {
  const email = req.body.email as string; const existing = await db.select().from(users).where(eq(users.email, email)).limit(1); if (existing[0]) throw new AppError(409, 'EMAIL_TAKEN', 'An account with that email already exists.');
  const [user] = await db.insert(users).values({ email, passwordHash: await hashPassword(req.body.password), username: await allocateUsername() }).returning();
  const session = await createSession(user.id); res.cookie(SESSION_COOKIE, session, cookieOptions); return res.status(201).json({ user: publicUser(user) });
}

export async function login(req: Request, res: Response) {
  const [user] = await db.select().from(users).where(eq(users.email, req.body.email as string)).limit(1); if (!user || !(await verifyPassword(req.body.password, user.passwordHash))) throw new AppError(401, 'INVALID_CREDENTIALS', 'Wrong email or password.'); const session = await createSession(user.id); res.cookie(SESSION_COOKIE, session, cookieOptions); return res.json({ user: publicUser(user) });
}

export async function logout(req: Request, res: Response) {
  const sessionId = req.cookies[SESSION_COOKIE]; if (sessionId) await destroySession(sessionId); res.clearCookie(SESSION_COOKIE, { path: '/' }); return res.status(204).send();
}

export async function me(_req: Request, res: Response) {
  return res.json({ user: publicUser(res.locals.user) });
}
