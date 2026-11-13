import { z } from 'zod';

// Request and response shapes shared by apps/web and apps/api.
// Keep this file in sync with docs/api-contract.md.

// ---------- Requests ----------

// TODO: agree on final password rules with the team.
export const signupRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72), // bcrypt only uses the first 72 bytes
});
export type SignupRequest = z.infer<typeof signupRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

// ---------- Profile (M1) ----------

// Values match data/problem-3 so seeded travellers and new users can be matched together.
export const GENDERS = ['FEMALE', 'MALE'] as const;
export const GENDER_PREFERENCES = ['ANY', 'SAME_GENDER'] as const;
export const HOME_CITIES = ['Bengaluru', 'Chennai', 'Delhi', 'Mumbai'] as const;
export const INTERESTS = [
  { id: 'TEMPLES', label: 'Temples and shrines' },
  { id: 'MUSEUMS', label: 'Museums and galleries' },
  { id: 'HISTORY', label: 'History and old towns' },
  { id: 'STREET_FOOD', label: 'Street food and markets' },
  { id: 'FINE_DINING', label: 'Fine dining' },
  { id: 'NIGHTLIFE', label: 'Nightlife' },
  { id: 'SHOPPING', label: 'Shopping' },
  { id: 'PHOTOGRAPHY', label: 'Photography' },
  { id: 'HIKING', label: 'Hiking' },
  { id: 'NATURE', label: 'Parks and gardens' },
  { id: 'BEACHES', label: 'Beaches' },
  { id: 'DESERT', label: 'Desert trips' },
  { id: 'ADVENTURE', label: 'Adventure' },
  { id: 'THEME_PARKS', label: 'Theme parks' },
  { id: 'BUDGET_STAYS', label: 'Budget stays' },
  { id: 'LUXURY', label: 'Luxury' },
] as const;
const INTEREST_IDS = INTERESTS.map((i) => i.id) as [
  (typeof INTERESTS)[number]['id'],
  ...(typeof INTERESTS)[number]['id'][],
];

/** PUT /api/profile */
export const profileRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  gender: z.enum(GENDERS),
  homeCity: z.enum(HOME_CITIES),
  interests: z
    .array(z.enum(INTEREST_IDS))
    .min(1, 'Pick at least one interest')
    .refine((a) => new Set(a).size === a.length, 'Interests must not repeat'),
  genderPreference: z.enum(GENDER_PREFERENCES).default('ANY'),
});
export type ProfileRequest = z.infer<typeof profileRequestSchema>;
export type ProfileInput = z.input<typeof profileRequestSchema>;

export type Profile = ProfileRequest & { updatedAt: string };

/** GET /api/profile (profile is null until the user saves it), PUT /api/profile */
export type ProfileResponse = { profile: Profile | null };

// ---------- Responses ----------

export const publicUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
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
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHENTICATED'
  | 'NOT_FOUND'
  | 'INTERNAL';

export type ErrorResponse = {
  error: { code: ErrorCode; message: string; fields?: Record<string, string> };
};
