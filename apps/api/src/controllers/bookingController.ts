import type { Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import type { Booking, BookingRequest, BookingResponse } from '@nomad/shared';
import { db } from '../db/index.js';
import { bookings } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertMember } from '../services/membership.js';
import { priceRoom } from '../services/pricing.js';

type BookingRow = {
  id: string; group_id: string; hotel_id: string; hotel_name: string; stars: number; rating: string; image: string | null;
  room_id: string; room_name: string; room_type: string; rooms_count: number; check_in: string; check_out: string;
  nights: number; members_count: number; total_inr: number; per_member_inr: string;
  booked_by: string; booked_by_name: string; created_at: Date;
};

function toBooking(r: BookingRow): Booking {
  return {
    id: r.id,
    groupId: r.group_id,
    hotel: { id: r.hotel_id, name: r.hotel_name, stars: r.stars, rating: Number(r.rating), image: r.image ? `/api/hotel-images/${r.image.split('/').pop()}` : null },
    room: { id: r.room_id, name: r.room_name, type: r.room_type },
    roomsCount: r.rooms_count,
    checkIn: r.check_in,
    checkOut: r.check_out,
    nights: r.nights,
    membersCount: r.members_count,
    totalInr: r.total_inr,
    perMemberInr: Number(r.per_member_inr),
    bookedBy: { id: r.booked_by, name: r.booked_by_name },
    createdAt: new Date(r.created_at).toISOString(),
  };
}

async function findBooking(groupId: string): Promise<Booking | null> {
  const { rows } = await db.execute<BookingRow>(sql`
    SELECT b.id, b.group_id, b.hotel_id, h.name AS hotel_name, h.stars, h.rating, h.image,
           b.room_id, r.name AS room_name, r.room_type, b.rooms_count,
           to_char(b.check_in, 'YYYY-MM-DD') AS check_in, to_char(b.check_out, 'YYYY-MM-DD') AS check_out,
           b.nights, b.members_count, b.total_inr, b.per_member_inr, b.booked_by, t.name AS booked_by_name, b.created_at
    FROM bookings b
    JOIN hotels h ON h.hotel_id = b.hotel_id
    JOIN rooms r ON r.room_id = b.room_id
    JOIN travellers t ON t.id = b.booked_by
    WHERE b.group_id = ${groupId}`);
  return rows[0] ? toBooking(rows[0]) : null;
}

function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
}

// GET /api/groups/:id/booking (member). The group's one booking, or null.
export async function getBooking(req: Request, res: Response) {
  await assertMember(req.params.id, req.user!.id);
  const body: BookingResponse = { booking: await findBooking(req.params.id) };
  res.json(body);
}

// POST /api/groups/:id/booking (member). A mock booking: saved and shown to every member,
// nothing is booked with a hotel and rooms_left is not changed (D-016).
// Any approved member may book once the group has at least 2 approved members (P4).
export async function createBooking(req: Request, res: Response) {
  const { traveller, group } = await assertMember(req.params.id, req.user!.id);
  const { roomId } = req.body as BookingRequest;
  try {
    await db.transaction(async (tx) => {
      // Lock the group so two members confirming at once can't both pass the checks.
      await tx.execute(sql`SELECT id FROM groups WHERE id = ${group.id} FOR UPDATE`);
      const { rows } = await tx.execute<{ n: number }>(
        sql`SELECT count(*)::int AS n FROM group_memberships WHERE group_id = ${group.id} AND status = 'approved'`,
      );
      const membersCount = rows[0].n;
      if (membersCount < 2) throw new AppError(409, 'NOT_ENOUGH_MEMBERS', 'Your group needs at least 2 members to book');
      const existing = await tx.execute(sql`SELECT 1 FROM bookings WHERE group_id = ${group.id}`);
      if (existing.rows.length) throw new AppError(409, 'ALREADY_BOOKED', 'Your group has already booked a hotel');
      const option = await priceRoom(group, membersCount, roomId, tx);
      if (!option) throw new AppError(409, 'NOT_AVAILABLE', 'That room is not free on every night for your group');
      await tx.insert(bookings).values({
        groupId: group.id,
        bookedBy: traveller.id,
        hotelId: option.hotel.id,
        roomId: option.room.id,
        roomsCount: option.roomsNeeded,
        checkIn: group.checkIn,
        checkOut: group.checkOut,
        nights: Math.round((Date.parse(group.checkOut) - Date.parse(group.checkIn)) / 86_400_000),
        membersCount,
        totalInr: option.totalInr,
        perMemberInr: option.perMemberInr.toFixed(2),
      });
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, 'ALREADY_BOOKED', 'Your group has already booked a hotel');
    throw err;
  }
  const body: BookingResponse = { booking: await findBooking(group.id) };
  res.status(201).json(body);
}
