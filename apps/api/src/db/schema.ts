import crypto from 'node:crypto';
import { date, integer, pgTable, smallint, text, timestamp, uuid, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  username: text('username').notNull().unique(),
  usernameEditCount: integer('username_edit_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // random token stored in the httpOnly cookie
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// A traveller profile (M1). Seeded travellers can exist without a user;
// signed-up users get a generated id linked through user_id.
export const travellers = pgTable('travellers', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: uuid('user_id')
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  age: integer('age'),
  gender: text('gender').notNull(),
  homeCity: text('home_city').notNull(),
  interests: text('interests').array().notNull(),
  genderPreference: text('gender_preference').notNull().default('ANY'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Read-only destination catalog used by M2 and later matching/hotel features.
export const destinationCountries = pgTable('destination_countries', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull(),
});

export const destinationCities = pgTable('destination_cities', {
  name: text('name').primaryKey(),
  countryCode: text('country_code')
    .notNull()
    .references(() => destinationCountries.code),
  airports: text('airports').array().notNull(),
});

export const groups = pgTable(
  'groups',
  {
    id: text('id')
      .primaryKey()
      .default(sql`'G-' || upper(substr(gen_random_uuid()::text, 1, 8))`),
    name: text('name').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => travellers.id),
    city: text('city')
      .notNull()
      .references(() => destinationCities.name),
    checkIn: date('check_in').notNull(),
    checkOut: date('check_out').notNull(),
    maxSize: smallint('max_size').notNull(),
    budgetInr: integer('budget_inr').notNull(),
    itinerary: text('itinerary').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('groups_size_check', sql`${table.maxSize} between 1 and 4`),
    check('groups_budget_check', sql`${table.budgetInr} > 0`),
    check(
      'groups_dates_check',
      sql`${table.checkIn} >= date '2027-04-01' and ${table.checkOut} <= date '2027-04-20' and ${table.checkOut} > ${table.checkIn}`,
    ),
    check('groups_name_check', sql`length(trim(${table.name})) between 1 and 80`),
  ],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Traveller = typeof travellers.$inferSelect;
export type GroupRow = typeof groups.$inferSelect;
