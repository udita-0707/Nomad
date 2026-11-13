import type { Request, Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import type { Group, GroupCreateRequest, GroupResponse, GroupsResponse } from '@nomad/shared';
import { db } from '../db/index.js';
import { groups, travellers, type GroupRow } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';

function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    city: row.city as Group['city'],
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    maxSize: row.maxSize,
    budgetInr: row.budgetInr,
    itinerary: row.itinerary,
    createdAt: row.createdAt.toISOString(),
  };
}

async function ownerTravellerId(userId: string): Promise<string> {
  const [traveller] = await db
    .select({ id: travellers.id })
    .from(travellers)
    .where(eq(travellers.userId, userId));
  if (!traveller) {
    throw new AppError(422, 'PROFILE_REQUIRED', 'Complete your traveller profile before creating a group post');
  }
  return traveller.id;
}

// GET /api/groups/mine (requireAuth)
export async function getMyGroups(req: Request, res: Response) {
  const ownerId = await ownerTravellerId(req.user!.id);
  const rows = await db.select().from(groups).where(eq(groups.ownerId, ownerId)).orderBy(desc(groups.createdAt));
  const body: GroupsResponse = { groups: rows.map(toGroup) };
  res.json(body);
}

// POST /api/groups (requireAuth)
export async function createGroup(req: Request, res: Response) {
  const ownerId = await ownerTravellerId(req.user!.id);
  const input = req.body as GroupCreateRequest;
  const [row] = await db
    .insert(groups)
    .values({
      ownerId,
      name: input.name,
      city: input.city,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      maxSize: input.maxSize,
      budgetInr: input.budgetInr,
      itinerary: input.itinerary,
    })
    .returning();
  const body: GroupResponse = { group: toGroup(row) };
  res.status(201).json(body);
}
