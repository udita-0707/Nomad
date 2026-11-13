import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import type { DestinationCity, HotelOptionsResponse, HotelSearchQuery } from '@nomad/shared';
import { db } from '../db/index.js';
import { destinationCities, destinationCountries } from '../db/schema.js';
import { assertMember } from '../services/membership.js';
import { hotelOptions } from '../services/pricing.js';

const DAY_MS = 86_400_000;

// GET /api/groups/:id/hotels (member). Searches the group's own city and dates.
// Booking is separate: see bookingController.ts (D-016).
export async function getGroupHotels(req: Request, res: Response) {
  const { group, membersCount } = await assertMember(req.params.id, req.user!.id);
  const filters = req.query as unknown as HotelSearchQuery;
  const [zone] = await db
    .select({ timezone: destinationCountries.timezone })
    .from(destinationCities)
    .innerJoin(destinationCountries, eq(destinationCountries.code, destinationCities.countryCode))
    .where(eq(destinationCities.name, group.city));

  const options = await hotelOptions(group, membersCount, filters);
  const body: HotelOptionsResponse = {
    context: {
      city: group.city as DestinationCity,
      checkIn: group.checkIn,
      checkOut: group.checkOut,
      nights: Math.round((Date.parse(group.checkOut) - Date.parse(group.checkIn)) / DAY_MS),
      membersCount,
      timezone: zone?.timezone ?? 'UTC',
    },
    options,
  };
  res.json(body);
}
