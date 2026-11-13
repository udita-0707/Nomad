import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import type { Search, SearchRequest, SearchResponse } from '@nomad/shared';
import { db } from '../db/index.js';
import { searches, travellers, type Traveller } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { findMatches } from '../services/matching.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

async function respond(res: Response, status: number, row: SearchRow) {
  const search = toSearch(row);
  const matches = await findMatches({ ...search, travellerId: row.travellerId });
  const body: SearchResponse = { search, matches };
  res.status(status).json(body);
}

// POST /api/searches (requireAuth). Saves the search, then returns the ranked matches.
// Gender is not on the form: matching uses the profile gender.
export async function createSearch(req: Request, res: Response) {
  const traveller = await currentTraveller(req.user!.id);
  const input = req.body as SearchRequest;
  const [row] = await db
    .insert(searches)
    .values({ ...input, travellerId: traveller.id, gender: traveller.gender })
    .returning();
  await respond(res, 201, row);
}

// GET /api/searches/:id/matches (requireAuth). Re-runs a saved search of the caller.
export async function getSearchMatches(req: Request, res: Response) {
  const traveller = await currentTraveller(req.user!.id);
  const id = req.params.id;
  const [row] = UUID.test(id)
    ? await db
        .select()
        .from(searches)
        .where(and(eq(searches.id, id), eq(searches.travellerId, traveller.id)))
    : [];
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Search not found');
  await respond(res, 200, row);
}
