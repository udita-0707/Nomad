import type { Request, Response } from 'express';
import { asc, eq } from 'drizzle-orm';
import { GROUP_DATE_MAX, GROUP_DATE_MIN, type CatalogResponse } from '@nomad/shared';
import { db } from '../db/index.js';
import { departureCities, destinationCities, destinationCountries, interests } from '../db/schema.js';

// Reference data never changes at runtime, so it is read once and kept in memory.
let cache: CatalogResponse | undefined;

async function loadCatalog(): Promise<CatalogResponse> {
  const [cities, departures, interestRows] = await Promise.all([
    db
      .select({
        name: destinationCities.name,
        countryCode: destinationCities.countryCode,
        countryName: destinationCountries.name,
        timezone: destinationCountries.timezone,
      })
      .from(destinationCities)
      .innerJoin(destinationCountries, eq(destinationCountries.code, destinationCities.countryCode))
      .orderBy(asc(destinationCities.name)),
    db.select().from(departureCities).orderBy(asc(departureCities.city)),
    db.select().from(interests),
  ]);
  return {
    destinationCities: cities as CatalogResponse['destinationCities'],
    departureCities: departures.map((d) => ({ city: d.city, airport: d.airport })) as CatalogResponse['departureCities'],
    interests: interestRows.map((i) => ({ id: i.interest, label: i.label, category: i.category })) as CatalogResponse['interests'],
    dateWindow: { from: GROUP_DATE_MIN, to: GROUP_DATE_MAX },
  };
}

// GET /api/catalog (public)
export async function getCatalog(_req: Request, res: Response) {
  cache ??= await loadCatalog();
  res.json(cache);
}
