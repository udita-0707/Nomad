import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import type { Search, SearchRequest, SearchResponse } from '@nomad/shared';
import { db } from '../db/index.js';
import { searches, travellers, type Traveller } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';

type SearchRow = typeof searches.$inferSelect;

async function currentTraveller(userId: string): Promise<Traveller> {
  const [traveller] = await db.select().from(travellers).where(eq(travellers.userId, userId));
  if (!traveller) {
    throw new AppError(422, 'PROFILE_REQUIRED', 'Complete your traveller profile before searching for groups');
  }
  return traveller;
}

function toSearch(row: SearchRow): Search {
  return {
    id: row.id,
    homeCity: row.homeCity as Search['homeCity'],
    city: row.city as Search['city'],
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    interests: row.interests as Search['interests'],
    budgetInr: row.budgetInr,
    gender: row.gender as Search['gender'],
    genderPreference: row.genderPreference as Search['genderPreference'],
    createdAt: row.createdAt.toISOString(),
  };
}

// POST /api/searches (requireAuth). Saves the search and returns it.
// Gender is not on the form: matching uses the profile gender.
// `matches` stays empty until M4 adds the matching query.
export async function createSearch(req: Request, res: Response) {
  const traveller = await currentTraveller(req.user!.id);
  const input = req.body as SearchRequest;
  const [row] = await db
    .insert(searches)
    .values({ ...input, travellerId: traveller.id, gender: traveller.gender })
    .returning();
  const body: SearchResponse = { search: toSearch(row), matches: [] };
  res.status(201).json(body);
}
