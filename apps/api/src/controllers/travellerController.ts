import type { Request, Response } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import type { TravellerProfileResponse } from '@nomad/shared';
import { db } from '../db/index.js';
import { groupMemberships, travellers } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';

const TRAVELLER_ID = /^[A-Za-z0-9-]{1,64}$/;

type GroupRow = {
  id: string; name: string; city: string; check_in: string; check_out: string;
  role: 'owner' | 'member'; members_count: number; max_size: number; booked: boolean;
};

async function viewerTraveller(userId: string) {
  const [row] = await db.select().from(travellers).where(eq(travellers.userId, userId));
  if (!row) throw new AppError(422, 'PROFILE_REQUIRED', 'Complete your traveller profile before viewing traveller profiles');
  return row;
}

export async function getTravellerProfile(req: Request, res: Response) {
  const viewer = await viewerTraveller(req.user!.id);
  const id = req.params.id;
  if (!TRAVELLER_ID.test(id)) throw new AppError(404, 'NOT_FOUND', 'Traveller not found');

  const [target] = await db.select().from(travellers).where(eq(travellers.id, id));
  if (!target) throw new AppError(404, 'NOT_FOUND', 'Traveller not found');

  const isMe = target.id === viewer.id;
  if (!isMe) {
    const [visible] = await db
      .select({ groupId: groupMemberships.groupId })
      .from(groupMemberships)
      .where(and(eq(groupMemberships.travellerId, target.id), eq(groupMemberships.status, 'approved')))
      .limit(1);
    if (!visible) throw new AppError(404, 'NOT_FOUND', 'Traveller not found');
  }

  const { rows } = await db.execute<GroupRow>(sql`
    SELECT g.id, g.name, g.city,
           to_char(g.check_in, 'YYYY-MM-DD') AS check_in,
           to_char(g.check_out, 'YYYY-MM-DD') AS check_out,
           CASE WHEN g.owner_id = ${target.id} THEN 'owner' ELSE 'member' END AS role,
           (SELECT count(*)::int FROM group_memberships a WHERE a.group_id = g.id AND a.status = 'approved') AS members_count,
           g.max_size,
           EXISTS (SELECT 1 FROM bookings b WHERE b.group_id = g.id) AS booked
    FROM group_memberships m
    JOIN groups g ON g.id = m.group_id
    WHERE m.traveller_id = ${target.id} AND m.status = 'approved'
    ORDER BY g.check_in ASC, g.id ASC`);

  const body: TravellerProfileResponse = {
    traveller: {
      id: target.id,
      name: target.name,
      age: target.age,
      homeCity: target.homeCity as TravellerProfileResponse['traveller']['homeCity'],
      homeAirport: target.homeAirport,
      interests: target.interests as TravellerProfileResponse['traveller']['interests'],
    },
    sharedInterests: isMe ? [] : target.interests.filter((interest) => viewer.interests.includes(interest)) as TravellerProfileResponse['sharedInterests'],
    isMe,
    groups: rows.map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city as TravellerProfileResponse['groups'][number]['city'],
      checkIn: row.check_in,
      checkOut: row.check_out,
      role: row.role,
      membersCount: Number(row.members_count),
      maxSize: Number(row.max_size),
      booked: row.booked,
    })),
  };
  res.json(body);
}
