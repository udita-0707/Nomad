// Database schema for M1 to M6 (see docs/decisions.md D-009 and D-010).
// Catalog tables are read-only and loaded from the data pack by `npm run db:seed`.
// App tables hold what users create. Seeded travellers and groups live in the
// same tables as app-created ones, so matching treats them the same.
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  smallint,
  numeric,
  boolean,
  date,
  time,
  primaryKey,
  foreignKey,
  unique,
  check,
  index,
  bigint,
} from 'drizzle-orm/pg-core';

// ============ Catalog (read-only) ============

export const destinationCountries = pgTable('destination_countries', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull(), // IANA zone, e.g. Asia/Tokyo
});

export const destinationCities = pgTable('destination_cities', {
  name: text('name').primaryKey(),
  countryCode: text('country_code')
    .notNull()
    .references(() => destinationCountries.code),
  airports: text('airports').array().notNull(),
});

export const departureCities = pgTable('departure_cities', {
  airport: text('airport').primaryKey(),
  city: text('city').notNull().unique(),
});

export const interests = pgTable('interests', {
  interest: text('interest').primaryKey(),
  label: text('label').notNull(),
  category: text('category').notNull(),
});

export const hotels = pgTable(
  'hotels',
  {
    hotelId: text('hotel_id').primaryKey(),
    name: text('name').notNull(),
    aliases: text('aliases')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    city: text('city')
      .notNull()
      .references(() => destinationCities.name),
    area: text('area').notNull(),
    lat: numeric('lat', { precision: 9, scale: 6 }).notNull(),
    lng: numeric('lng', { precision: 9, scale: 6 }).notNull(),
    rating: numeric('rating', { precision: 3, scale: 1 }).notNull(),
    stars: smallint('stars').notNull(),
    checkInFrom: time('check_in_from').notNull(),
    checkOutUntil: time('check_out_until').notNull(),
    familyFriendly: boolean('family_friendly').notNull(),
    image: text('image'),
  },
  (t) => [
    check('hotels_rating_check', sql`${t.rating} BETWEEN 0 AND 10`),
    check('hotels_stars_check', sql`${t.stars} BETWEEN 1 AND 5`),
    index('hotels_city_idx').on(t.city),
  ],
);

export const rooms = pgTable(
  'rooms',
  {
    roomId: text('room_id').primaryKey(),
    hotelId: text('hotel_id')
      .notNull()
      .references(() => hotels.hotelId),
    roomType: text('room_type').notNull(),
    name: text('name').notNull(),
    maxAdults: smallint('max_adults').notNull(),
    maxChildren: smallint('max_children').notNull(),
    pricePerNightAmount: integer('price_per_night_amount').notNull(), // price_per_night.amount
    pricePerNightCurrency: text('price_per_night_currency').notNull().default('INR'),
    refundable: boolean('refundable').notNull(),
  },
  (t) => [
    // Lets saved options and bookings prove the room belongs to the hotel.
    unique('rooms_room_id_hotel_id_unique').on(t.roomId, t.hotelId),
    check('rooms_max_adults_check', sql`${t.maxAdults} > 0`),
    check('rooms_max_children_check', sql`${t.maxChildren} >= 0`),
    check('rooms_price_check', sql`${t.pricePerNightAmount} > 0`),
    check('rooms_currency_check', sql`${t.pricePerNightCurrency} = 'INR'`),
    index('rooms_hotel_idx').on(t.hotelId),
  ],
);

export const availability = pgTable(
  'availability',
  {
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.roomId),
    date: date('date').notNull(),
    roomsLeft: smallint('rooms_left').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.roomId, t.date] }),
    check('availability_date_check', sql`${t.date} BETWEEN '2027-04-01' AND '2027-04-20'`),
    check('availability_rooms_left_check', sql`${t.roomsLeft} >= 0`),
  ],
);

// ============ App-owned ============

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  username: text('username').notNull().unique(),
  usernameEditCount: integer('username_edit_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(), // random token stored in the httpOnly cookie
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

// Every traveller (M1): the 24 seeded ones (T-001...) have no user,
// signed-up users get a generated id linked through user_id.
export const travellers = pgTable(
  'travellers',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    userId: uuid('user_id')
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    age: smallint('age'),
    gender: text('gender').notNull(),
    homeCity: text('home_city')
      .notNull()
      .references(() => departureCities.city),
    homeAirport: text('home_airport').references(() => departureCities.airport),
    interests: text('interests').array().notNull(),
    genderPreference: text('gender_preference').notNull().default('ANY'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('travellers_name_check', sql`length(trim(${t.name})) BETWEEN 1 AND 60`),
    check('travellers_age_check', sql`${t.age} BETWEEN 18 AND 120`),
    check('travellers_gender_check', sql`${t.gender} IN ('FEMALE', 'MALE')`),
    check('travellers_interests_check', sql`cardinality(${t.interests}) >= 1`),
    check(
      'travellers_gender_preference_check',
      sql`${t.genderPreference} IN ('ANY', 'SAME_GENDER')`,
    ),
  ],
);

export const groups = pgTable(
  'groups',
  {
    id: text('id')
      .primaryKey()
      .default(sql`'G-' || substr(gen_random_uuid()::text, 1, 8)`),
    name: text('name').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => travellers.id),
    city: text('city')
      .notNull()
      .references(() => destinationCities.name),
    checkIn: date('check_in').notNull(),
    checkOut: date('check_out').notNull(),
    maxSize: smallint('max_size').notNull(), // owner included
    budgetInr: integer('budget_inr').notNull(),
    itinerary: text('itinerary').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('groups_name_check', sql`length(trim(${t.name})) BETWEEN 1 AND 80`),
    check('groups_max_size_check', sql`${t.maxSize} BETWEEN 2 AND 4`),
    check('groups_budget_check', sql`${t.budgetInr} > 0`),
    check(
      'groups_dates_check',
      sql`${t.checkIn} >= '2027-04-01' AND ${t.checkOut} <= '2027-04-20' AND ${t.checkOut} > ${t.checkIn}`,
    ),
    index('groups_city_dates_idx').on(t.city, t.checkIn, t.checkOut),
    index('groups_owner_idx').on(t.ownerId),
  ],
);

export const searches = pgTable(
  'searches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    travellerId: text('traveller_id')
      .notNull()
      .references(() => travellers.id, { onDelete: 'cascade' }),
    homeCity: text('home_city')
      .notNull()
      .references(() => departureCities.city),
    city: text('city')
      .notNull()
      .references(() => destinationCities.name),
    checkIn: date('check_in').notNull(),
    checkOut: date('check_out').notNull(),
    budgetInr: integer('budget_inr').notNull(),
    interests: text('interests').array().notNull(),
    gender: text('gender').notNull(),
    genderPreference: text('gender_preference').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('searches_budget_check', sql`${t.budgetInr} > 0`),
    check('searches_interests_check', sql`cardinality(${t.interests}) >= 1`),
    check('searches_gender_check', sql`${t.gender} IN ('FEMALE', 'MALE')`),
    check('searches_gender_preference_check', sql`${t.genderPreference} IN ('ANY', 'SAME_GENDER')`),
    check(
      'searches_dates_check',
      sql`${t.checkIn} >= '2027-04-01' AND ${t.checkOut} <= '2027-04-20' AND ${t.checkOut} > ${t.checkIn}`,
    ),
    index('searches_traveller_idx').on(t.travellerId, t.createdAt.desc()),
  ],
);

// Join requests and members (M5): one row per (group, traveller).
// The owner is an approved row. The primary key blocks duplicate requests.
export const groupMemberships = pgTable(
  'group_memberships',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    travellerId: text('traveller_id')
      .notNull()
      .references(() => travellers.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
    searchId: uuid('search_id').references(() => searches.id, {
      onDelete: 'set null',
    }),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.travellerId] }),
    check('memberships_status_check', sql`${t.status} IN ('pending', 'approved', 'rejected')`),
    check('memberships_decided_check', sql`(${t.status} = 'pending') = (${t.decidedAt} IS NULL)`),
    index('memberships_approved_idx')
      .on(t.groupId)
      .where(sql`${t.status} = 'approved'`),
    index('memberships_pending_idx')
      .on(t.groupId)
      .where(sql`${t.status} = 'pending'`),
    index('memberships_traveller_idx').on(t.travellerId),
  ],
);

// Hotel options members save on the Common Group Page (M6). Costs are a snapshot.
export const savedOptions = pgTable(
  'saved_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    savedBy: text('saved_by')
      .notNull()
      .references(() => travellers.id),
    hotelId: text('hotel_id')
      .notNull()
      .references(() => hotels.hotelId),
    roomId: text('room_id').notNull(),
    roomsCount: smallint('rooms_count').notNull(),
    nights: smallint('nights').notNull(),
    membersCount: smallint('members_count').notNull(),
    totalInr: integer('total_inr').notNull(),
    perMemberInr: numeric('per_member_inr', {
      precision: 12,
      scale: 2,
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'saved_options_room_hotel_fk',
      columns: [t.roomId, t.hotelId],
      foreignColumns: [rooms.roomId, rooms.hotelId],
    }),
    unique('saved_options_group_member_room_unique').on(t.groupId, t.savedBy, t.roomId),
    check(
      'saved_options_counts_check',
      sql`${t.roomsCount} > 0 AND ${t.nights} > 0 AND ${t.membersCount} > 0`,
    ),
    check('saved_options_cost_check', sql`${t.totalInr} > 0 AND ${t.perMemberInr} > 0`),
    index('saved_options_group_idx').on(t.groupId),
  ],
);

// The one locked booking of a group (M6). A trigger in migration 0004 makes rows
// immutable and closes the group to new requests and approvals.
export const bookings = pgTable(
  'bookings',
  {
    id: text('id')
      .primaryKey()
      .default(sql`'BK-' || upper(substr(gen_random_uuid()::text, 1, 8))`),
    groupId: text('group_id')
      .notNull()
      .unique()
      .references(() => groups.id),
    savedOptionId: uuid('saved_option_id').references(() => savedOptions.id),
    bookedBy: text('booked_by')
      .notNull()
      .references(() => travellers.id),
    hotelId: text('hotel_id')
      .notNull()
      .references(() => hotels.hotelId),
    roomId: text('room_id').notNull(),
    roomsCount: smallint('rooms_count').notNull(),
    checkIn: date('check_in').notNull(),
    checkOut: date('check_out').notNull(),
    nights: smallint('nights').notNull(),
    membersCount: smallint('members_count').notNull(),
    totalInr: integer('total_inr').notNull(),
    perMemberInr: numeric('per_member_inr', {
      precision: 12,
      scale: 2,
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'bookings_room_hotel_fk',
      columns: [t.roomId, t.hotelId],
      foreignColumns: [rooms.roomId, rooms.hotelId],
    }),
    check('bookings_counts_check', sql`${t.roomsCount} > 0 AND ${t.membersCount} > 0`),
    check('bookings_nights_check', sql`${t.nights} = ${t.checkOut} - ${t.checkIn}`),
    check('bookings_total_check', sql`${t.totalInr} > 0`),
    check(
      'bookings_split_check',
      sql`${t.perMemberInr} = round(${t.totalInr}::numeric / ${t.membersCount}, 2)`,
    ),
  ],
);

// Group chat (S1): append-only messages from approved members. The id orders messages.
export const groupMessages = pgTable(
  'group_messages',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => travellers.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('group_messages_body_check', sql`length(trim(${t.body})) BETWEEN 1 AND 1000`),
    index('group_messages_group_idx').on(t.groupId, t.id.desc()),
  ],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Traveller = typeof travellers.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMembership = typeof groupMemberships.$inferSelect;
export type SavedOption = typeof savedOptions.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type GroupMessage = typeof groupMessages.$inferSelect;
