import type { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';

// TODO: POST /api/auth/signup
// 1. Check email is not taken (409 EMAIL_TAKEN).
// 2. Hash password (services/password.ts).
// 3. Allocate username (services/username.ts) and insert user.
// 4. Create session (services/session.ts), set cookie, return 201 { user }.
export async function signup(_req: Request, _res: Response) {
  throw new AppError(501, 'INTERNAL', 'Signup not implemented yet');
}

// TODO: POST /api/auth/login
// Look up user by email, verify password (401 INVALID_CREDENTIALS on failure),
// create session, set cookie, return 200 { user }.
export async function login(_req: Request, _res: Response) {
  throw new AppError(501, 'INTERNAL', 'Login not implemented yet');
}

// TODO: POST /api/auth/logout
// Delete the session row for the cookie, clear the cookie, return 204.
export async function logout(_req: Request, _res: Response) {
  throw new AppError(501, 'INTERNAL', 'Logout not implemented yet');
}

// TODO: GET /api/auth/me
// requireAuth sets res.locals.user. Return 200 { user }.
export async function me(_req: Request, _res: Response) {
  throw new AppError(501, 'INTERNAL', 'Me not implemented yet');
}
