// Loads the read-only catalog and the seeded travellers and groups from the data pack.
// Safe to run more than once: existing rows are left as they are.
// Run with `npm run db:seed` after `npm run db:migrate`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, pool } from './index.js';
import { availability, groupMemberships, groups, hotels, rooms, travellers } from './schema.js';

const dataDir = fileURLToPath(new URL('../../../../data/', import.meta.url));
const load = <T>(path: string): T => JSON.parse(readFileSync(dataDir + path, 'utf8')) as T;

type HotelJson = {
  hotel_id: string;
  name: string;
  aliases: string[];
  city: string;
  area: string;
  lat: number;
  lng: number;
  rating: number;
  stars: number;
  check_in_from: string;
  check_out_until: string;
  family_friendly: boolean;
  image: string | null;
};
type RoomJson = {
  room_id: string;
  hotel_id: string;
  room_type: string;
  name: string;
  max_adults: number;
  max_children: number;
  price_per_night: { amount: number; currency: string };
  refundable: boolean;
};
type AvailabilityJson = { room_id: string; date: string; rooms_left: number };
type TravellerJson = {
  traveller_id: string;
  name: string;
  age: number;
  gender: string;
  home_city: string;
  home_airport: string;
  interests: string[];
  gender_preference: string;
};
type GroupJson = {
  group_id: string;
  name: string;
  owner_id: string;
  member_ids: string[];
  city: string;
  check_in: string;
  check_out: string;
  max_size: number;
  budget_inr: number;
  itinerary: string;
};

async function main() {
  const hotelRows = load<HotelJson[]>('catalog/hotels.json');
  const roomRows = load<RoomJson[]>('catalog/rooms.json');
  const availabilityRows = load<AvailabilityJson[]>('catalog/availability.json');
  const travellerRows = load<TravellerJson[]>('problem-3/travellers.json');
  const groupRows = load<GroupJson[]>('problem-3/groups.json');

  await db.transaction(async (tx) => {
    await tx
      .insert(hotels)
      .values(
        hotelRows.map((h) => ({
          hotelId: h.hotel_id,
          name: h.name,
          aliases: h.aliases,
          city: h.city,
          area: h.area,
          lat: String(h.lat),
          lng: String(h.lng),
          rating: String(h.rating),
          stars: h.stars,
          checkInFrom: h.check_in_from,
          checkOutUntil: h.check_out_until,
          familyFriendly: h.family_friendly,
          image: h.image,
        })),
      )
      .onConflictDoNothing();

    await tx
      .insert(rooms)
      .values(
        roomRows.map((r) => ({
          roomId: r.room_id,
          hotelId: r.hotel_id,
          roomType: r.room_type,
          name: r.name,
          maxAdults: r.max_adults,
          maxChildren: r.max_children,
          pricePerNightAmount: r.price_per_night.amount,
          pricePerNightCurrency: r.price_per_night.currency,
          refundable: r.refundable,
        })),
      )
      .onConflictDoNothing();

    // 2,500 rows: insert in chunks to stay under the parameter limit.
    for (let i = 0; i < availabilityRows.length; i += 1000) {
      await tx
        .insert(availability)
        .values(
          availabilityRows.slice(i, i + 1000).map((a) => ({
            roomId: a.room_id,
            date: a.date,
            roomsLeft: a.rooms_left,
          })),
        )
        .onConflictDoNothing();
    }

    await tx
      .insert(travellers)
      .values(
        travellerRows.map((t) => ({
          id: t.traveller_id,
          name: t.name,
          age: t.age,
          gender: t.gender,
          homeCity: t.home_city,
          homeAirport: t.home_airport,
          interests: t.interests,
          genderPreference: t.gender_preference,
        })),
      )
      .onConflictDoNothing();

    await tx
      .insert(groups)
      .values(
        groupRows.map((g) => ({
          id: g.group_id,
          name: g.name,
          ownerId: g.owner_id,
          city: g.city,
          checkIn: g.check_in,
          checkOut: g.check_out,
          maxSize: g.max_size,
          budgetInr: g.budget_inr,
          itinerary: g.itinerary,
        })),
      )
      .onConflictDoNothing();

    // member_ids includes the owner; all are approved members.
    await tx
      .insert(groupMemberships)
      .values(
        groupRows.flatMap((g) =>
          g.member_ids.map((travellerId) => ({
            groupId: g.group_id,
            travellerId,
            status: 'approved',
            decidedAt: new Date(),
          })),
        ),
      )
      .onConflictDoNothing();
  });

  console.log(
    `Seeded ${hotelRows.length} hotels, ${roomRows.length} rooms, ${availabilityRows.length} availability rows, ` +
      `${travellerRows.length} travellers, ${groupRows.length} groups.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
