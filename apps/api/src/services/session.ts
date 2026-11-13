// httpOnly cookie sessions. The cookie holds a random id that is a row in `sessions`.
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sessions, users, type User } from '../db/schema.js';

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? 'sid';
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
  await db
    .insert(sessions)
    .values({ id, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) });
  return id;
}

// Returns the session's user, or null if the session is missing or expired.
// Expired sessions are deleted.
export async function getValidSession(id: string): Promise<User | null> {
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id));
  if (!row) return null;
  if (row.session.expiresAt.getTime() <= Date.now()) {
    await destroySession(id);
    return null;
  }
  return row.user;
}

export async function destroySession(id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id));
}
