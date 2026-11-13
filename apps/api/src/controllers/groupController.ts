import type { Request, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import type { Group, GroupCreateRequest, GroupResponse, GroupsResponse, GroupSummary, RequestedGroup } from '@nomad/shared';
import { db } from '../db/index.js';
import { groupMemberships, groups, travellers, type Group as GroupRow } from '../db/schema.js';
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

type MineRow = {
  id: string; owner_id: string; name: string; city: Group['city']; check_in: string; check_out: string;
  max_size: number; budget_inr: number; itinerary: string; created_at: Date; owner_name: string;
  nights: number; members_count: number; pending_count: number; booked: boolean; booked_hotel: string | null;
  my_status: 'pending' | 'approved' | 'rejected';
};

function toSummary(r: MineRow, isOwner: boolean): GroupSummary {
  return {
    id: r.id, ownerId: r.owner_id, name: r.name, city: r.city, checkIn: r.check_in, checkOut: r.check_out,
    maxSize: r.max_size, budgetInr: r.budget_inr, itinerary: r.itinerary, createdAt: new Date(r.created_at).toISOString(),
    ownerName: r.owner_name, nights: r.nights, membersCount: r.members_count,
    pendingCount: isOwner ? r.pending_count : 0, booked: r.booked, bookedHotelName: r.booked_hotel,
  };
}

// GET /api/groups/mine (requireAuth). Every group the caller has a membership row in,
// split by role: owned, joined (approved, not owner) and requested (pending or rejected).
export async function getMyGroups(req: Request, res: Response) {
  const me = await ownerTravellerId(req.user!.id);
  const { rows } = await db.execute<MineRow>(sql`
    SELECT g.id, g.owner_id, g.name, g.city, to_char(g.check_in, 'YYYY-MM-DD') AS check_in,
           to_char(g.check_out, 'YYYY-MM-DD') AS check_out, g.max_size, g.budget_inr, g.itinerary, g.created_at,
           o.name AS owner_name, (g.check_out - g.check_in)::int AS nights,
           (SELECT count(*)::int FROM group_memberships a WHERE a.group_id = g.id AND a.status = 'approved') AS members_count,
           (SELECT count(*)::int FROM group_memberships p WHERE p.group_id = g.id AND p.status = 'pending') AS pending_count,
           EXISTS (SELECT 1 FROM bookings b WHERE b.group_id = g.id) AS booked,
           (SELECT h.name FROM bookings b JOIN hotels h ON h.hotel_id = b.hotel_id WHERE b.group_id = g.id) AS booked_hotel,
           m.status AS my_status
    FROM group_memberships m
    JOIN groups g ON g.id = m.group_id
    JOIN travellers o ON o.id = g.owner_id
    WHERE m.traveller_id = ${me}
    ORDER BY g.created_at DESC, g.id`);
  const body: GroupsResponse = {
    groups: rows.filter((r) => r.owner_id === me).map((r) => toSummary(r, true)),
    joined: rows.filter((r) => r.owner_id !== me && r.my_status === 'approved').map((r) => toSummary(r, false)),
    requested: rows
      .filter((r) => r.owner_id !== me && r.my_status !== 'approved')
      .map((r): RequestedGroup => ({ ...toSummary(r, false), requestStatus: r.my_status as RequestedGroup['requestStatus'] })),
  };
  res.json(body);
}

// POST /api/groups (requireAuth)
export async function createGroup(req: Request, res: Response) {
  const ownerId = await ownerTravellerId(req.user!.id);
  const input = req.body as GroupCreateRequest;
  // The owner is an approved member (P1, D-012), so member counts and the gender rule
  // treat new groups the same as the seeded ones.
  const row = await db.transaction(async (tx) => {
    const [created] = await tx
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
    await tx
      .insert(groupMemberships)
      .values({ groupId: created.id, travellerId: ownerId, status: 'approved', decidedAt: new Date() });
    return created;
  });
  const body: GroupResponse = { group: toGroup(row) };
  res.status(201).json(body);
}
