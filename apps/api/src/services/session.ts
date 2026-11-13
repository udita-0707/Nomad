import crypto from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sessions, users } from '../db/schema.js';

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? 'nomad_sid';
export const SESSION_TTL_MS = Number(process.env.SESSION_TTL_DAYS ?? 7) * 24 * 60 * 60 * 1000;

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_TTL_MS,
  path: '/',
};

export async function createSession(userId: string): Promise<string> {
  const id = crypto.randomBytes(32).toString('base64url');
  await db.insert(sessions).values({ id, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) });
  return id;
}

export async function getSessionUser(sessionId: string): Promise<typeof users.$inferSelect | null> {
  const rows = await db.select({ user: users }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date()))).limit(1);
  return rows[0]?.user ?? null;
}

export async function destroySession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}
