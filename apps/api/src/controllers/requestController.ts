import type { Request, Response } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import type { JoinRequestItem, JoinRequestResponse, JoinRequestsResponse, MemberCard } from '@nomad/shared';
import { db } from '../db/index.js';
import { groupMemberships, groups, searches, travellers, bookings } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { matchOneGroup, type Seeker } from '../services/matching.js';

type MembershipRow = {
  group_id: string; traveller_id: string; status: 'pending' | 'approved' | 'rejected';
  requested_at: Date; decided_at: Date | null;
  traveller_id_card: string; traveller_name: string; traveller_age: number | null;
  traveller_gender: string; traveller_home_city: string; traveller_interests: string[];
  search_id: string | null; search_check_in: string | null; search_check_out: string | null;
  search_budget: number | null; search_interests: string[] | null;
};

function memberCard(row: MembershipRow): MemberCard {
  return { id: row.traveller_id_card, name: row.traveller_name, age: row.traveller_age,
    gender: row.traveller_gender as MemberCard['gender'], homeCity: row.traveller_home_city as MemberCard['homeCity'],
    interests: row.traveller_interests as MemberCard['interests'] };
}

function toItem(row: MembershipRow, ownerInterests?: string[]): JoinRequestItem {
  const interests = row.search_interests ?? [];
  const shared = interests.filter((i) => (ownerInterests ?? row.traveller_interests).includes(i));
  return { groupId: row.group_id, travellerId: row.traveller_id, status: row.status,
    requestedAt: new Date(row.requested_at).toISOString(), decidedAt: row.decided_at ? new Date(row.decided_at).toISOString() : null,
    traveller: memberCard(row), sharedInterests: shared as JoinRequestItem['sharedInterests'],
    search: row.search_id ? { id: row.search_id, checkIn: row.search_check_in!, checkOut: row.search_check_out!, budgetInr: row.search_budget! } : null };
}

async function currentTraveller(userId: string) {
  const [row] = await db.select().from(travellers).where(eq(travellers.userId, userId));
  if (!row) throw new AppError(422, 'PROFILE_REQUIRED', 'Complete your traveller profile before continuing');
  return row;
}

async function groupForOwner(groupId: string, travellerId: string) {
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) throw new AppError(404, 'NOT_FOUND', 'Group not found');
  if (group.ownerId !== travellerId) throw new AppError(403, 'FORBIDDEN', 'Only the group owner can manage requests');
  return group;
}

async function booked(groupId: string) {
  const [row] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.groupId, groupId));
  return Boolean(row);
}

async function requestRows(groupId: string, status?: string) {
  const statusFilter = status && status !== 'all' ? sql`AND m.status = ${status}` : sql``;
  const result = await db.execute<MembershipRow>(sql`
    SELECT m.group_id, m.traveller_id, m.status, m.requested_at, m.decided_at,
      t.id AS traveller_id_card, t.name AS traveller_name, t.age AS traveller_age,
      t.gender AS traveller_gender, t.home_city AS traveller_home_city, t.interests AS traveller_interests,
      s.id AS search_id, to_char(s.check_in, 'YYYY-MM-DD') AS search_check_in,
      to_char(s.check_out, 'YYYY-MM-DD') AS search_check_out, s.budget_inr AS search_budget,
      s.interests AS search_interests
    FROM group_memberships m JOIN travellers t ON t.id = m.traveller_id
      LEFT JOIN searches s ON s.id = m.search_id
    WHERE m.group_id = ${groupId} ${statusFilter}
    ORDER BY m.requested_at ASC`);
  return result.rows;
}

async function oneRequest(groupId: string, travellerId: string) {
  const rows = await requestRows(groupId, 'all');
  return rows.find((row) => row.traveller_id === travellerId);
}

// POST /api/groups/:id/requests
export async function createJoinRequest(req: Request, res: Response) {
  const traveller = await currentTraveller(req.user!.id);
  const groupId = req.params.id;
  const { searchId } = req.body as { searchId: string };
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) throw new AppError(404, 'NOT_FOUND', 'Group not found');
  const [owner] = await db.select({ interests: travellers.interests }).from(travellers).where(eq(travellers.id, group.ownerId));
  const [search] = await db.select().from(searches).where(and(eq(searches.id, searchId), eq(searches.travellerId, traveller.id)));
  if (!search) throw new AppError(404, 'NOT_FOUND', 'Search not found');
  const existing = await oneRequest(groupId, traveller.id);
  if (existing) throw new AppError(409, 'ALREADY_REQUESTED', 'You have already requested this group');
  if (await booked(groupId)) throw new AppError(409, 'GROUP_BOOKED', 'This group is already booked');
  const seeker: Seeker = { ...search, gender: search.gender as Seeker['gender'], genderPreference: search.genderPreference as Seeker['genderPreference'], interests: search.interests as Seeker['interests'], city: search.city as Seeker['city'], travellerId: traveller.id };
  if (!(await matchOneGroup(seeker, groupId))) throw new AppError(409, 'NOT_A_MATCH', 'This group no longer matches your search');
  try {
    await db.insert(groupMemberships).values({ groupId, travellerId: traveller.id, searchId, status: 'pending' });
  } catch (error) {
    if (String(error).includes('duplicate key')) throw new AppError(409, 'ALREADY_REQUESTED', 'You have already requested this group');
    throw error;
  }
  const row = await oneRequest(groupId, traveller.id);
  const body: JoinRequestResponse = { request: toItem(row!, owner?.interests) };
  res.status(201).json(body);
}

// GET /api/groups/:id/requests (owner only)
export async function listGroupRequests(req: Request, res: Response) {
  const traveller = await currentTraveller(req.user!.id);
  await groupForOwner(req.params.id, traveller.id);
  const status = String(req.query.status ?? 'pending');
  if (status !== 'pending' && status !== 'all') throw new AppError(400, 'VALIDATION_ERROR', 'Status must be pending or all', { status: 'Use pending or all' });
  const rows = await requestRows(req.params.id, status);
  const body: JoinRequestsResponse = { requests: rows.map((row) => toItem(row, traveller.interests)) };
  res.json(body);
}

// PATCH /api/groups/:id/requests/:travellerId (owner only)
export async function decideGroupRequest(req: Request, res: Response) {
  const owner = await currentTraveller(req.user!.id);
  const groupId = req.params.id;
  const targetId = req.params.travellerId;
  const status = (req.body as { status: 'approved' | 'rejected' }).status;
  await groupForOwner(groupId, owner.id);
  await db.transaction(async (tx) => {
    const locked = await tx.execute<{ id: string; max_size: number }>(sql`SELECT id, max_size FROM groups WHERE id = ${groupId} FOR UPDATE`);
    if (!locked.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Group not found');
    const rows = await tx.select().from(groupMemberships).where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.travellerId, targetId)));
    const request = rows[0];
    if (!request) throw new AppError(404, 'NOT_FOUND', 'Join request not found');
    if (request.status !== 'pending') throw new AppError(409, 'NOT_PENDING', 'This request has already been decided');
    if (status === 'approved') {
      const [booking] = await tx.select({ id: bookings.id }).from(bookings).where(eq(bookings.groupId, groupId));
      if (booking) throw new AppError(409, 'GROUP_BOOKED', 'This group is already booked');
      const count = await tx.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM group_memberships WHERE group_id = ${groupId} AND status = 'approved'`);
      if (Number(count.rows[0]?.count ?? 0) >= Number(locked.rows[0].max_size)) throw new AppError(409, 'GROUP_FULL', 'This group is full');
      const [search] = request.searchId ? await tx.select().from(searches).where(eq(searches.id, request.searchId)) : [];
      if (!search) throw new AppError(409, 'NOT_A_MATCH', 'The original search is no longer available');
      const seeker: Seeker = { ...search, gender: search.gender as Seeker['gender'], genderPreference: search.genderPreference as Seeker['genderPreference'], interests: search.interests as Seeker['interests'], city: search.city as Seeker['city'], travellerId: targetId, ignoreExistingMembership: true };
      if (!(await matchOneGroup(seeker, groupId))) throw new AppError(409, 'NOT_A_MATCH', 'This request no longer matches the group rules');
    }
    const [updated] = await tx.update(groupMemberships).set({ status, decidedAt: new Date() }).where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.travellerId, targetId))).returning();
    return updated;
  });
  const row = await oneRequest(groupId, targetId);
  const body: JoinRequestResponse = { request: toItem(row!, owner.interests) };
  res.json(body);
}

// DELETE /api/groups/:id/requests/me (member only; rejection remains permanent)
export async function cancelJoinRequest(req: Request, res: Response) {
  const traveller = await currentTraveller(req.user!.id);
  const row = await oneRequest(req.params.id, traveller.id);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Join request not found');
  if (row.status !== 'pending') throw new AppError(409, 'NOT_PENDING', 'Only a pending request can be cancelled');
  await db.delete(groupMemberships).where(and(eq(groupMemberships.groupId, req.params.id), eq(groupMemberships.travellerId, traveller.id)));
  res.status(204).send();
}
