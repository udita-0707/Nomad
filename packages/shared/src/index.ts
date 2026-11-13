import { z } from 'zod';

// Request and response shapes shared by apps/web and apps/api.
// Keep this file in sync with docs/api-contract.md.

// ---------- Requests ----------

// TODO: agree on final password rules with the team.
export const signupRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username must be 24 characters or fewer')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Use only letters, numbers, hyphens, or underscores')
    .optional()
    .or(z.literal('')),
  password: z.string().min(8).max(72), // bcrypt only uses the first 72 bytes
});
export type SignupRequest = z.infer<typeof signupRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const updateUsernameRequestSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username must be 24 characters or fewer')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Use only letters, numbers, hyphens, or underscores'),
});
export type UpdateUsernameRequest = z.infer<typeof updateUsernameRequestSchema>;

// ---------- Responses ----------

export const publicUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  usernameEditCount: z.number().int().min(0).max(1),
  createdAt: z.string(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

/** POST /api/auth/signup, POST /api/auth/login, GET /api/auth/me */
export type UserResponse = { user: PublicUser };

/** GET /api/dashboard */
export type DashboardOption = 'group_creator' | 'group_seeker';
export type DashboardResponse = { user: PublicUser; options: DashboardOption[] };

/** GET /api/health */
export type HealthResponse = { status: 'ok'; db: 'up' | 'down' };

// ---------- Errors ----------

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'EMAIL_TAKEN'
  | 'USERNAME_TAKEN'
  | 'USERNAME_UPDATE_LIMIT_REACHED'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHENTICATED'
  | 'NOT_FOUND'
  | 'INTERNAL';

export type ErrorResponse = {
  error: { code: ErrorCode; message: string; fields?: Record<string, string> };
};
