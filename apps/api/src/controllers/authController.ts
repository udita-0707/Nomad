import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import type { LoginRequest, PublicUser, SignupRequest, UserResponse } from '@nomad/shared';
import { db } from '../db/index.js';
import { users, type User } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { hashPassword, verifyPassword } from '../services/password.js';
import { randomUsername } from '../services/username.js';
import {
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  destroySession,
} from '../services/session.js';

const MAX_USERNAME_ATTEMPTS = 5;

// Never expose password_hash.
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    createdAt: user.createdAt.toISOString(),
  };
}

function isUniqueViolation(err: unknown, constraint: string): boolean {
  const e = err as {
    code?: string;
    constraint?: string;
    cause?: { code?: string; constraint?: string };
  };
  const pgErr = e?.code ? e : e?.cause;
  return pgErr?.code === '23505' && pgErr.constraint === constraint;
}

async function startSession(res: Response, userId: string) {
  const sid = await createSession(userId);
  res.cookie(SESSION_COOKIE, sid, cookieOptions);
}

// POST /api/auth/signup
export async function signup(req: Request, res: Response) {
  const { email, password } = req.body as SignupRequest;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');

  const passwordHash = await hashPassword(password);

  let user: User | undefined;
  for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS && !user; attempt++) {
    try {
      [user] = await db
        .insert(users)
        .values({ email, passwordHash, username: randomUsername() })
        .returning();
    } catch (err) {
      if (isUniqueViolation(err, 'users_email_unique')) {
        throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
      }
      if (!isUniqueViolation(err, 'users_username_unique')) throw err;
      // Username taken: try another one.
    }
  }
  if (!user) throw new AppError(500, 'INTERNAL', 'Could not allocate a username, please retry');

  await startSession(res, user.id);
  const body: UserResponse = { user: toPublicUser(user) };
  res.status(201).json(body);
}

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  const { email, password } = req.body as LoginRequest;

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  await startSession(res, user.id);
  const body: UserResponse = { user: toPublicUser(user) };
  res.json(body);
}

// POST /api/auth/logout
export async function logout(req: Request, res: Response) {
  const sid = req.cookies?.[SESSION_COOKIE];
  if (sid) await destroySession(sid);
  const { httpOnly, sameSite, secure, path } = cookieOptions;
  res.clearCookie(SESSION_COOKIE, { httpOnly, sameSite, secure, path });
  res.status(204).end();
}

// GET /api/auth/me (requireAuth)
export async function me(req: Request, res: Response) {
  const body: UserResponse = { user: toPublicUser(req.user!) };
  res.json(body);
}
