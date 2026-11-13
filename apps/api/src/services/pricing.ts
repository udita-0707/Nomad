import { sql } from 'drizzle-orm';
import type { HotelOption, HotelSearchQuery } from '@nomad/shared';
import { db } from '../db/index.js';

// db or a transaction, so booking can price inside its lock.
type Executor = Pick<typeof db, 'execute'>;

type Stay = { city: string; checkIn: string; checkOut: string };

type OptionRow = {
  hotel_id: string;
  hotel_name: string;
  stars: number;
  rating: string;
  image: string | null;
  family_friendly: boolean;
  room_id: string;
  room_name: string;
  room_type: string;
  max_adults: number;
  refundable: boolean;
  price: number;
  rooms_needed: number;
  total: number;
  per_member: string;
  min_rooms_left: number;
};

const ORDER = {
  perMember: sql`per_member ASC, rating DESC, hotel_id ASC, room_id ASC`,
  rating: sql`rating DESC, per_member ASC, hotel_id ASC, room_id ASC`,
  stars: sql`stars DESC, per_member ASC, hotel_id ASC, room_id ASC`,
} as const;

// Hotel photos are served by the API (app.ts), never read from data files by the frontend.
function imageUrl(path: string | null) {
  return path ? `/api/hotel-images/${path.split('/').pop()}` : null;
}

// Every room type in the group's city that is free for the whole stay, priced for the
// current members (DATA_DICTIONARY.md): rooms = ceil(members / max_adults); each night
// check_in .. check_out-1 needs rooms_left >= rooms (a missing night counts as full);
// total = price x rooms x nights; per member = round(total / members, 2). Never cached.
export async function hotelOptions(
  stay: Stay,
  membersCount: number,
  filters: HotelSearchQuery,
  onlyRoomId?: string,
  exec: Executor = db,
): Promise<HotelOption[]> {
  const roomFilter = onlyRoomId ? sql`AND r.room_id = ${onlyRoomId}` : sql``;
  const refundable = filters.refundable === 'true' ? sql`AND r.refundable` : sql``;
  const minStars = filters.minStars ? sql`AND h.stars >= ${filters.minStars}` : sql``;
  const { rows } = await exec.execute<OptionRow>(sql`
    WITH stay AS (
      SELECT ${stay.checkIn}::date AS check_in, ${stay.checkOut}::date AS check_out,
             (${stay.checkOut}::date - ${stay.checkIn}::date) AS nights, ${membersCount}::int AS members
    ),
    priced AS (
      SELECT h.hotel_id, h.name AS hotel_name, h.stars, h.rating, h.image, h.family_friendly,
             r.room_id, r.name AS room_name, r.room_type, r.max_adults, r.refundable,
             r.price_per_night_amount AS price,
             ceil(s.members::numeric / r.max_adults)::int AS rooms_needed, s.nights, s.members, s.check_in, s.check_out
      FROM rooms r
      JOIN hotels h ON h.hotel_id = r.hotel_id
      CROSS JOIN stay s
      WHERE h.city = ${stay.city} ${refundable} ${minStars} ${roomFilter}
    )
    SELECT p.hotel_id, p.hotel_name, p.stars, p.rating, p.image, p.family_friendly,
           p.room_id, p.room_name, p.room_type, p.max_adults, p.refundable, p.price, p.rooms_needed,
           (p.price * p.rooms_needed * p.nights)::int AS total,
           round((p.price * p.rooms_needed * p.nights)::numeric / p.members, 2) AS per_member,
           a.min_left::int AS min_rooms_left
    FROM priced p
    JOIN LATERAL (
      SELECT count(*) AS free_nights, min(rooms_left) AS min_left
      FROM availability
      WHERE room_id = p.room_id AND date >= p.check_in AND date < p.check_out AND rooms_left >= p.rooms_needed
    ) a ON a.free_nights = p.nights
    ORDER BY ${ORDER[filters.sort]}`);

  return rows.map((r) => ({
    hotel: {
      id: r.hotel_id,
      name: r.hotel_name,
      stars: r.stars,
      rating: Number(r.rating),
      image: imageUrl(r.image),
      familyFriendly: r.family_friendly,
    },
    room: {
      id: r.room_id,
      name: r.room_name,
      type: r.room_type,
      maxAdults: r.max_adults,
      refundable: r.refundable,
      pricePerNightInr: r.price,
    },
    roomsNeeded: r.rooms_needed,
    totalInr: r.total,
    perMemberInr: Number(r.per_member),
    minRoomsLeft: r.min_rooms_left,
  }));
}

// One room type priced for the group right now, or null if it is not in the group's city
// or not free for every night (used by booking; the client never sends a price).
export async function priceRoom(stay: Stay, membersCount: number, roomId: string, exec: Executor = db) {
  const [option] = await hotelOptions(stay, membersCount, { sort: 'perMember' }, roomId, exec);
  return option ?? null;
}
