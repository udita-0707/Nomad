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

// ---------- Traveller profile ----------

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
const INTEREST_IDS = INTERESTS.map((i) => i.id) as [(typeof INTERESTS)[number]['id'], ...(typeof INTERESTS)[number]['id'][]];

export const profileRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  gender: z.enum(GENDERS),
  homeCity: z.enum(HOME_CITIES),
  interests: z.array(z.enum(INTEREST_IDS)).min(1, 'Pick at least one interest').refine((a) => new Set(a).size === a.length, 'Interests must not repeat'),
  genderPreference: z.enum(GENDER_PREFERENCES).default('ANY'),
});
export type ProfileRequest = z.infer<typeof profileRequestSchema>;
export type ProfileInput = z.input<typeof profileRequestSchema>;
export type Profile = ProfileRequest & { updatedAt: string };
export type ProfileResponse = { profile: Profile | null };

// ---------- Group owner / M2 ----------

export const DESTINATION_CITIES = ['Tokyo', 'Kyoto', 'Osaka', 'Dubai', 'Abu Dhabi'] as const;
export const GROUP_DATE_MIN = '2027-04-01';
export const GROUP_DATE_MAX = '2027-04-20';

export const groupDateSchema = z
  .string()
  .regex(/^2027-04-(0[1-9]|1[0-9]|20)$/, 'Choose a date from 1 to 20 April 2027');

export const groupCreateRequestSchema = z
  .object({
    name: z.string().trim().min(1, 'Group name is required').max(80, 'Group name must be 80 characters or fewer'),
    city: z.enum(DESTINATION_CITIES),
    checkIn: groupDateSchema,
    checkOut: groupDateSchema,
    maxSize: z.number().int().min(2).max(4),
    budgetInr: z.number().int().positive().max(10_000_000),
    itinerary: z.string().trim().max(2000, 'Itinerary must be 2,000 characters or fewer').default(''),
  })
  .superRefine((value, ctx) => {
    if (value.checkOut <= value.checkIn) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['checkOut'], message: 'Check-out must be after check-in' });
    }
  });
export type GroupCreateRequest = z.infer<typeof groupCreateRequestSchema>;

export type Group = GroupCreateRequest & {
  id: string;
  ownerId: string;
  createdAt: string;
};
export type GroupResponse = { group: Group };
export type GroupsResponse = { groups: Group[] };

// ---------- Lane A: search (M3, M4) ----------

export type InterestId = (typeof INTERESTS)[number]['id'];
export type DestinationCity = (typeof DESTINATION_CITIES)[number];
export type HomeCity = (typeof HOME_CITIES)[number];

export const searchRequestSchema = z
  .object({
    homeCity: z.enum(HOME_CITIES),
    city: z.enum(DESTINATION_CITIES),
    checkIn: groupDateSchema,
    checkOut: groupDateSchema,
    interests: z
      .array(z.enum(INTEREST_IDS))
      .min(1, 'Pick at least one interest')
      .refine((a) => new Set(a).size === a.length, 'Interests must not repeat'),
    budgetInr: z
      .number({ invalid_type_error: 'Enter your budget in INR' })
      .int('Use a whole number of rupees')
      .positive('Budget must be more than 0')
      .max(10_000_000, 'Budget must be 1,00,00,000 or less'),
    genderPreference: z.enum(GENDER_PREFERENCES),
  })
  .superRefine((value, ctx) => {
    if (value.checkOut <= value.checkIn) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['checkOut'], message: 'Check-out must be after check-in' });
    }
  });
export type SearchRequest = z.infer<typeof searchRequestSchema>;

export type Search = SearchRequest & {
  id: string;
  gender: (typeof GENDERS)[number];
  createdAt: string;
};

export type Match = {
  groupId: string;
  name: string;
  city: DestinationCity;
  checkIn: string;
  checkOut: string;
  membersCount: number;
  maxSize: number;
  ownerName: string;
  sharedNights: number;
  sharedInterests: InterestId[];
  budgetInr: number;
  budgetDiffInr: number;
};

/** POST /api/searches (201), GET /api/searches/:id/matches (200) */
export type SearchResponse = { search: Search; matches: Match[] };

/** GET /api/catalog */
export type CatalogResponse = {
  destinationCities: { name: DestinationCity; countryCode: string; timezone: string }[];
  departureCities: { city: HomeCity; airport: string }[];
  interests: { id: InterestId; label: string; category: string }[];
  dateWindow: { from: string; to: string };
};

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
  | 'PROFILE_REQUIRED'
  | 'NOT_FOUND'
  | 'INTERNAL';

export type ErrorResponse = {
  error: { code: ErrorCode; message: string; fields?: Record<string, string> };
};
