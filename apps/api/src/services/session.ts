// httpOnly cookie sessions. The cookie holds a random id that is a row in `sessions`.
// TODO: implement with crypto.randomBytes(32).toString('base64url') and db.

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? 'nomad_sid';
export const SESSION_TTL_MS = Number(process.env.SESSION_TTL_DAYS ?? 7) * 24 * 60 * 60 * 1000;

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_TTL_MS,
  path: '/',
};

export async function createSession(_userId: string): Promise<string> {
  throw new Error('TODO: insert session row, return its id');
}

export async function getSessionUser(_sessionId: string): Promise<unknown | null> {
  throw new Error('TODO: join sessions -> users, return null if missing or expired');
}

export async function destroySession(_sessionId: string): Promise<void> {
  throw new Error('TODO: delete session row');
}
