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
/** A group plus its live counts (contract: GroupSummary). pendingCount is 0 unless the caller owns it. */
export type GroupSummary = Group & {
  ownerName: string;
  nights: number;
  membersCount: number;
  pendingCount: number;
  booked: boolean;
  bookedHotelName: string | null;
};
export type RequestedGroup = GroupSummary & { requestStatus: 'pending' | 'rejected' };
/** GET /api/groups/mine: groups I own, groups I joined (approved, not owner), and my open or declined requests. */
export type GroupsResponse = { groups: GroupSummary[]; joined: GroupSummary[]; requested: RequestedGroup[] };

// ---------- Group requests / M5 ----------

export const joinRequestSchema = z.object({ searchId: z.string().uuid() });
export type JoinRequest = z.infer<typeof joinRequestSchema>;

export const decideRequestSchema = z.object({ status: z.enum(['approved', 'rejected']) });
export type DecideRequest = z.infer<typeof decideRequestSchema>;

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';
export type MemberCard = {
  id: string;
  name: string;
  age: number | null;
  gender: (typeof GENDERS)[number];
  homeCity: HomeCity;
  interests: InterestId[];
};
export type RequestSearch = { id: string; checkIn: string; checkOut: string; budgetInr: number };
export type JoinRequestItem = {
  groupId: string;
  travellerId: string;
  status: JoinRequestStatus;
  requestedAt: string;
  decidedAt: string | null;
  traveller: MemberCard;
  sharedInterests: InterestId[];
  search: RequestSearch | null;
};
export type JoinRequestResponse = { request: JoinRequestItem };
export type JoinRequestsResponse = { requests: JoinRequestItem[] };

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
  members: { id: string; name: string; gender: (typeof GENDERS)[number]; isOwner: boolean }[];
  femaleCount: number;
  maleCount: number;
};

/** POST /api/searches (201), GET /api/searches/:id/matches (200) */
export const GENDER_COMPOSITIONS = ['ANY', 'ALL_FEMALE', 'ALL_MALE', 'MIXED'] as const;
export type GenderComposition = (typeof GENDER_COMPOSITIONS)[number];

const queryInterestSchema = z.preprocess(
  (value, ctx) => {
    if (value === undefined || value === '') return [];
    if (Array.isArray(value) && value.length === 0) return [];
    if (Array.isArray(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use one comma-separated interests parameter' });
      return z.NEVER;
    }
    if (typeof value !== 'string') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid interests filter' });
      return z.NEVER;
    }
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  },
  z.array(z.enum(INTEREST_IDS)).max(16).refine((items) => new Set(items).size === items.length, 'Interests must not repeat'),
);

export const matchFiltersQuerySchema = z.object({
  interests: queryInterestSchema.default([]),
  gender: z.enum(GENDER_COMPOSITIONS).default('ANY'),
});
export type MatchFilters = z.infer<typeof matchFiltersQuerySchema>;
export type SearchResponse = { search: Search; matches: Match[]; totalMatches: number; filters: MatchFilters };

/** GET /api/catalog */
export type CatalogResponse = {
  destinationCities: { name: DestinationCity; countryCode: string; countryName: string; timezone: string }[];
  departureCities: { city: HomeCity; airport: string }[];
  interests: { id: InterestId; label: string; category: string }[];
  dateWindow: { from: string; to: string };
};

export type ProfileGroup = {
  id: string;
  name: string;
  city: DestinationCity;
  checkIn: string;
  checkOut: string;
  role: 'owner' | 'member';
  membersCount: number;
  maxSize: number;
  booked: boolean;
};

export type TravellerProfileResponse = {
  traveller: { id: string; name: string; age: number | null; homeCity: HomeCity; homeAirport: string | null; interests: InterestId[] };
  sharedInterests: InterestId[];
  isMe: boolean;
  groups: ProfileGroup[];
};

// ---------- Lane C: group page (M6) ----------

export const HOTEL_SORTS = ['perMember', 'rating', 'stars'] as const;

/** GET /api/groups/:id/hotels query string. Values arrive as strings. */
export const hotelSearchQuerySchema = z.object({
  sort: z.enum(HOTEL_SORTS).default('perMember'),
  refundable: z.literal('true').optional(),
  minStars: z.coerce.number().int().min(1, 'Stars must be 1 to 5').max(5, 'Stars must be 1 to 5').optional(),
});
export type HotelSearchQuery = z.infer<typeof hotelSearchQuerySchema>;
export type HotelSearchFilters = z.input<typeof hotelSearchQuerySchema>;

export type HotelOption = {
  hotel: { id: string; name: string; stars: number; rating: number; image: string | null; familyFriendly: boolean };
  room: { id: string; name: string; type: string; maxAdults: number; refundable: boolean; pricePerNightInr: number };
  roomsNeeded: number;
  totalInr: number;
  perMemberInr: number;
  minRoomsLeft: number;
};

export const bookingRequestSchema = z.object({ roomId: z.string().trim().min(1, 'Choose a room') });
export type BookingRequest = z.infer<typeof bookingRequestSchema>;

/** A saved (mock) booking: one per group, never changed. Nothing is booked with a real hotel. */
export type Booking = {
  id: string;
  groupId: string;
  hotel: { id: string; name: string; stars: number; rating: number; image: string | null };
  room: { id: string; name: string; type: string };
  roomsCount: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  membersCount: number;
  totalInr: number;
  perMemberInr: number;
  bookedBy: { id: string; name: string };
  createdAt: string;
};
/** POST /api/groups/:id/booking (201, booking set), GET /api/groups/:id/booking (200, booking or null) */
export type BookingResponse = { booking: Booking | null };

/** GET /api/groups/:id/hotels */
export type HotelOptionsResponse = {
  context: {
    city: DestinationCity;
    checkIn: string;
    checkOut: string;
    nights: number;
    membersCount: number;
    timezone: string;
  };
  options: HotelOption[];
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
  | 'FORBIDDEN'
  | 'ALREADY_REQUESTED'
  | 'NOT_A_MATCH'
  | 'NOT_PENDING'
  | 'GROUP_FULL'
  | 'GROUP_BOOKED'
  | 'NOT_AVAILABLE'
  | 'NOT_ENOUGH_MEMBERS'
  | 'ALREADY_BOOKED'
  | 'INTERNAL';

export type ErrorResponse = {
  error: { code: ErrorCode; message: string; fields?: Record<string, string> };
};

// ---------- Group chat (S1) ----------

export const CHAT_MAX_LENGTH = 1000;
export const CHAT_PAGE_SIZE = 50;

export const chatMessageInputSchema = z.object({
  body: z
    .string()
    .transform((s) => s.replace(/\r\n?/g, '\n').trim())
    .pipe(
      z
        .string()
        .min(1, 'Write a message')
        // count code points like Postgres length(), so emoji can't pass zod and fail the DB check
        .refine((s) => [...s].length <= CHAT_MAX_LENGTH, `Keep it to ${CHAT_MAX_LENGTH} characters`),
    ),
});
export type ChatMessageInput = z.infer<typeof chatMessageInputSchema>;

export const chatHistoryQuerySchema = z.object({
  before: z.coerce.number().int().positive('Invalid cursor').optional(),
});

export type ChatMessage = {
  id: number;
  author: { id: string; name: string };
  body: string;
  createdAt: string; // ISO
  mine: boolean; // the caller wrote it
};
/** GET /api/groups/:id/messages: oldest first within the page */
export type ChatMessagesResponse = { messages: ChatMessage[]; hasMore: boolean };
/** POST /api/groups/:id/messages */
export type ChatMessageResponse = { message: ChatMessage };
