# Nomad engineering notes

How the app is put together, for anyone changing it. For setup, see the README. Rules for each endpoint are in `docs/api-contract.md`, and the reasons behind choices are in `docs/decisions.md`.

## Layout

```
apps/api         Express API (TypeScript, run with tsx)
apps/web         React app (Vite, React Router, React Query)
packages/shared  Zod schemas, types and constants used by both apps
data/, images/   The hackathon data pack (read-only)
docs/            API contract and decision log
```

It's an npm workspace. Run scripts from the repo root:

| Script | What it does |
|---|---|
| `npm run dev` | API and web together |
| `npm run db:migrate` | Apply migrations in `apps/api/drizzle` |
| `npm run db:seed` | Load the catalog, 24 travellers and 12 groups from `data/` |
| `npm run typecheck` | `tsc` in every workspace |
| `npm run lint` | ESLint over the repo |
| `npm run format` | Prettier |

## How a request flows

The browser calls `/api/...` on the Vite dev server, which proxies to the API. Each route is built the same way:

```
requireAuth -> validateBody / validateQuery (Zod schema from @nomad/shared) -> asyncHandler(controller)
```

- `requireAuth` reads the `sid` cookie and loads the user from `sessions`. Without one it returns 401.
- `validateBody` and `validateQuery` return 400 `VALIDATION_ERROR` with a `fields` map.
- Controllers throw `AppError(status, code, message)`. `errorHandler` turns it into `{ error: { code, message, fields? } }`. Anything else becomes a 500 `INTERNAL`.
- Group page endpoints call `assertMember(groupId, userId)` from `services/membership.ts`. It returns the traveller, the group and the members count, or throws 422 `PROFILE_REQUIRED`, 404 `NOT_FOUND` or 403 `FORBIDDEN`, in that order.

Reads that join several tables use raw `sql` through Drizzle (see `bookingController.ts`). Simple inserts and selects use the Drizzle query builder.

## Database

Postgres 16, with the schema in `apps/api/src/db/schema.ts` and migrations in `apps/api/drizzle`.

**Catalog (read-only, loaded by the seed):** `destination_countries`, `destination_cities`, `departure_cities`, `interests`, `hotels`, `rooms`, `availability`.

**App data:**

| Table | Holds |
|---|---|
| `users`, `sessions` | Accounts and cookie sessions |
| `travellers` | Profiles. Seeded ones have ids like `T-001` and no user. |
| `groups` | Group posts. The owner is also an approved member. |
| `searches` | Saved searches, used to rank matches and to re-check a join request |
| `group_memberships` | One row per traveller per group: `pending`, `approved` or `rejected` |
| `saved_options` | Defined but not used yet (D-014) |
| `bookings` | At most one per group |
| `group_messages` | Chat messages. Append-only, ordered by `id`. |

Two triggers from migration 0004 stop a booking from being changed or deleted, and block new requests and approvals once a group is booked.

To change the schema, edit `schema.ts`, then run `npx drizzle-kit generate --name <name>` inside `apps/api` (the root script doesn't pass `--name` through), check the SQL, and run `npm run db:migrate`.

## API map

| Area | Endpoints | Code |
|---|---|---|
| Auth | `/api/auth/signup`, `login`, `logout`, `me`, `profile/username` | `authController.ts`, `services/session.ts` |
| Profile | `GET/PUT /api/profile` | `profileController.ts` |
| Dashboard | `GET /api/dashboard` | `dashboardController.ts` |
| Catalog | `GET /api/catalog` | `catalogController.ts` |
| Groups | `POST /api/groups`, `GET /api/groups/mine` | `groupController.ts` |
| Search and matches | `POST /api/searches`, `GET /api/searches/:id/matches` | `searchController.ts`, `services/matching.ts`, `services/matchFilters.ts` |
| Join requests | `/api/groups/:id/requests` (create, list, decide, cancel) | `requestController.ts` |
| Traveller profiles | `GET /api/travellers/:id` | `travellerController.ts` |
| Hotels | `GET /api/groups/:id/hotels` | `hotelController.ts`, `services/pricing.ts` |
| Booking | `GET/POST /api/groups/:id/booking` | `bookingController.ts` |
| Chat | `GET/POST /api/groups/:id/messages` | `chatController.ts` |

Matching runs the six rules from the problem statement (same city, at least 2 shared nights, budget within 40%, at least 2 shared interests, gender preference, a free place) in one SQL query in `services/matching.ts`. The same check runs again when a request is made and when it's approved.

Hotel prices are always worked out on the server: price per night × rooms needed × nights, split equally between the approved members.

## Frontend

- Pages are in `apps/web/src/pages`, one per route in `App.tsx`. Signed-in routes are wrapped in `ProtectedRoute`.
- All calls go through `lib/api.ts`, which throws `ApiError` with the status and the error body.
- Each area has a React Query hook in `lib/` (`useGroupPage.ts`, `useGroupChat.ts` and so on). Queries don't retry on a 4xx.
- Styles are in one file, `styles.css`, with phone rules under `@media (max-width: 760px)`.
- The chat polls every 4 seconds while the tab is visible and merges messages by id, so nothing is lost when the newest page moves on.

## Conventions

- Change `docs/api-contract.md` first, then the code. Shared shapes go in `packages/shared/src/index.ts`.
- Rules live in the API. The web app only shows what the API returns.
- Log any decision about the schema, API shape, rules or scope in `docs/decisions.md`, in the same commit as the change. Use the same format as the existing entries.
- One feature per branch and PR. Run `npm run typecheck` and `npm run lint` before pushing.
