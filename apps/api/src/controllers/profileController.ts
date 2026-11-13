import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import type { Profile, ProfileRequest, ProfileResponse } from '@nomad/shared';
import { db } from '../db/index.js';
import { profiles, type ProfileRow } from '../db/schema.js';

function toProfile(row: ProfileRow): Profile {
  return {
    name: row.name,
    gender: row.gender as Profile['gender'],
    homeCity: row.homeCity as Profile['homeCity'],
    interests: row.interests as Profile['interests'],
    genderPreference: row.genderPreference as Profile['genderPreference'],
    updatedAt: row.updatedAt.toISOString(),
  };
}

// GET /api/profile (requireAuth). Returns { profile: null } until the user saves one.
export async function getProfile(req: Request, res: Response) {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, req.user!.id));
  const body: ProfileResponse = { profile: row ? toProfile(row) : null };
  res.json(body);
}

// PUT /api/profile (requireAuth). Creates or replaces the user's profile.
export async function putProfile(req: Request, res: Response) {
  const input = req.body as ProfileRequest;
  const values = { ...input, updatedAt: new Date() };
  const [row] = await db
    .insert(profiles)
    .values({ userId: req.user!.id, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values })
    .returning();
  const body: ProfileResponse = { profile: toProfile(row) };
  res.json(body);
}
