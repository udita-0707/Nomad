import crypto from 'node:crypto';
import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  username: text('username').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // random token stored in the httpOnly cookie
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// A traveller profile (M1). Seeded travellers from data/problem-3 have ids like
// "T-001" and no user; signed-up users get a generated id and their user_id.
// Allowed values are checked by Zod in @nomad/shared.
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

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Traveller = typeof travellers.$inferSelect;
