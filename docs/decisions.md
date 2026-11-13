# Nomad decision log

Append-only: add new entries at the end and never rewrite old ones.

Entry format:

    ## D-NNN | YYYY-MM-DD HH:MM | Short title
    - Context: what problem or gap this answers
    - Decision: what we chose
    - Rejected: alternative (why not), alternative (why not)
    - Why: the main reason
    - Trade-off / revisit if: what we give up, and when to change it
    - Files: paths touched

## D-001 | 2026-11-13 13:34 | PostgreSQL via Docker for persistence
- Context: user, session and group data must survive server restarts.
- Decision: PostgreSQL 16 run locally with docker compose.
- Rejected: in-memory store (lost on restart), SQLite (differs from a hosted Postgres we may deploy to).
- Why: one command gives every teammate the same real database.
- Trade-off / revisit if: needs Docker installed; switch to a hosted Postgres (Neon) for deployment.
- Files: docker-compose.yml, .env.example

## D-002 | 2026-11-13 13:34 | Drizzle ORM for database access
- Context: the API needs typed queries and repeatable schema changes for every teammate.
- Decision: Drizzle ORM with drizzle-kit migrations, replacing the earlier plan of raw SQL with pg.
- Rejected: raw SQL with pg (no types, migrations by hand), Prisma (heavier, own schema language).
- Why: typed queries close to plain SQL, plus generated migrations.
- Trade-off / revisit if: one more tool to learn; revisit if a query needs SQL Drizzle can't express (use its sql helper).
- Files: apps/api/src/db/schema.ts, apps/api/src/db/index.ts, apps/api/drizzle.config.ts, apps/api/drizzle/

## D-003 | 2026-11-13 13:34 | Cookie sessions stored in the database, not JWT
- Context: we need login that survives page refreshes and a logout that really works.
- Decision: random 32-byte session id in an httpOnly cookie, with the session row in the sessions table, expiring after 7 days.
- Rejected: JWT (can't be revoked before it expires), localStorage tokens (readable by scripts, so open to XSS theft).
- Why: deleting the row revokes the session immediately.
- Trade-off / revisit if: one database lookup per protected request; revisit if traffic makes that slow.
- Files: apps/api/src/services/session.ts, apps/api/src/middleware/requireAuth.ts

## D-004 | 2026-11-13 13:34 | Backend owns matching, ranking and cost logic
- Context: matching travellers to groups, ranking results and costing trips must give the same answer everywhere.
- Decision: all matching, ranking and cost calculations live in the API; the frontend only displays results.
- Rejected: computing in the browser (logic duplicated, easy to tamper with).
- Why: one source of truth that can be tested in one place.
- Trade-off / revisit if: more API calls for small UI changes; revisit only for purely visual sorting.
- Files: apps/api/src

## D-005 | 2026-11-13 13:34 | Catalog data is read-only, loaded by a separate loader
- Context: destinations, hotels, rooms and availability come as fixed JSON files in data/catalog.
- Decision: a separate loader imports the catalog; the app only reads it and never writes to it.
- Rejected: editing catalog data through the API (not needed, and risks corrupting the provided dataset).
- Why: keeps the provided data intact and makes reloads repeatable.
- Trade-off / revisit if: catalog changes need a reload; revisit if the problem adds catalog editing.
- Files: data/catalog

## D-006 | 2026-11-13 13:34 | No AI or LLM calls inside the app
- Context: the event rules forbid AI or LLM calls in the product.
- Decision: all matching and ranking use plain, deterministic code.
- Rejected: LLM-based matching or recommendations (against the rules).
- Why: required by the event.
- Trade-off / revisit if: no fuzzy natural-language features; revisit only if the rules change.
- Files: none

## D-007 | 2026-11-13 13:47 | CHANGE: keep email login and add a profile for M1
- Context: M1 asks for a profile (name, gender, origin city, interests) that survives a refresh; email and password are not required.
- Decision: keep email and password auth, add a profiles table (one per user) with GET and PUT /api/profile and a setup page shown before the dashboard; also store gender preference (default ANY) because the matching rules need it.
- Rejected: name-only signup (rewrites working auth for little gain), free-text city and interests (would not match the seeded travellers).
- Why: least rework, and allowed values match data/problem-3 so new users and seeded travellers match on the same terms.
- Trade-off / revisit if: users still create a password M1 doesn't need; age is not collected yet, add it if G2 member pages are built.
- Files: apps/api/src/db/schema.ts, apps/api/drizzle/0001_profiles.sql, apps/api/src/controllers/profileController.ts, apps/api/src/routes/profile.ts, apps/api/src/app.ts, packages/shared/src/index.ts, apps/web/src/pages/ProfileSetup.tsx, apps/web/src/pages/Dashboard.tsx, apps/web/src/App.tsx, apps/web/src/lib/api.ts, apps/web/src/lib/useProfile.ts, docs/api-contract.md

## D-008 | 2026-11-13 14:17 | Rename profiles to travellers with their own id
- Context: the 24 seeded travellers in data/problem-3 have no email or password, so they can't live in a table keyed by users.id.
- Decision: replace profiles with travellers (text id, optional unique user_id, age column); seeds will keep ids like T-001, signed-up users get a generated id. Migration 0002 copies existing profiles across.
- Rejected: fake user accounts for seeds (fake emails and passwords), a separate seed table (two places to match against).
- Why: one table for everyone the matcher compares, with the data pack's ids intact.
- Trade-off / revisit if: travellers.id is text, not uuid; the API path stays /api/profile, so the frontend is unchanged.
- Files: apps/api/src/db/schema.ts, apps/api/drizzle/0002_travellers.sql, apps/api/drizzle/meta/0002_snapshot.json, apps/api/drizzle/meta/_journal.json, apps/api/src/controllers/profileController.ts

## D-009 | 2026-11-13 16:56 | Matching and membership rules for the full schema
- Context: three gaps in the problem statement: who the gender rule checks, whether a group of 1 is allowed, and whether a booked group takes members.
- Decision: gender preference is checked both ways against every approved member, not just the owner; max_size is 2 to 4; a booked group is closed (a trigger refuses new requests and approvals, pending ones may be rejected).
- Rejected: owner-only gender check (lets a same-gender seeker into a mixed group), size 1 (can never take anyone), approvals after booking (per-member split goes stale).
- Why: Aman's call, safest reading for travellers and keeps the cost split correct.
- Trade-off / revisit if: stricter than the written rule, so fewer matches; revisit if the organizers say owner-only.
- Files: docs/decisions.md (design; built in D-010)

## D-010 | 2026-11-13 17:10 | Build the full M1 to M6 schema in Drizzle
- Context: the code had only users, sessions and travellers, without the agreed constraints; the M2 to M6 tables and the catalog did not exist.
- Decision: migration 0004 adds the 7 catalog tables and groups, searches, group_memberships, saved_options, bookings with the agreed checks, indexes and triggers; travellers gets home_airport, a DB default id, smallint age, CHECKs and FKs to departure_cities; `npm run db:seed` loads hotels, rooms, availability and the seeded travellers and groups. Kept users.username_edit_count (teammate's one-time username edit).
- Rejected: catalog read straight from JSON (no FKs, matching can't be one SQL query), loading every catalog table inside the migration (2,500 availability rows in a migration file).
- Why: the six matching rules, membership states and booking lock are enforced by the database, and seeded and new data share the same tables.
- Trade-off / revisit if: the four small reference tables are filled by the migration so the travellers FK holds; no M2 to M6 endpoints yet.
- Files: apps/api/src/db/schema.ts, apps/api/src/db/seed.ts, apps/api/drizzle/0004_full_schema.sql, apps/api/drizzle/meta/0004_snapshot.json, apps/api/drizzle/meta/_journal.json, apps/api/package.json, package.json, README.md

## D-011 | 2026-11-13 17:30 | API shape for M2 to M6
- Context: Aman asked for every endpoint through M6 before building; the statement leaves who can book, how requests link to searches, and ranking open.
- Decision: 25 endpoints as in the API spec doc; the owner is stored as an approved membership; join requests carry a searchId and the server re-checks all six rules; approvals lock the group row; ranking is shared interests, shared nights, budget gap, earliest check-in, id; any approved member books once 2+ members are in; hotel costs are always recomputed on the server.
- Rejected: trusting the client's match list (judges can call the API directly), owner-only booking (FAQ says any member), cached prices (members count changes).
- Why: correctness on judge requests matters most, so every rule is enforced where the state changes.
- Trade-off / revisit if: more endpoints than a minimal demo needs; drop 19 and 23 if time runs short.
- Files: docs/decisions.md

## D-012 | 2026-11-13 18:43 | M3 search form and saved searches, separate from M4
- Context: Aman wants M3 and M4 on separate branches; M3 is the seeker's form inside the data's cities and dates, M4 is the match list.
- Decision: M3 builds GET /api/catalog and POST /api/searches, which validates, takes gender from the profile, saves the search and returns matches as an empty list; the /search form is prefilled from the profile and shows a saved confirmation. M4 adds matching, the matches endpoint and page on a branch stacked on M3, with the same response shape.
- Rejected: a separate GET /api/searches/:id for M3 (extra endpoint not in the contract), a gender field on the form (not in M3's criteria), hard-coded city lists in the form (the catalog endpoint is the source).
- Why: each milestone can be reviewed and merged on its own without changing the contract.
- Trade-off / revisit if: on the M3 branch alone a search shows no groups; merge M4 right after M3.
- Files: packages/shared/src/index.ts, apps/api/src/controllers/{catalogController,searchController}.ts, apps/api/src/routes/{catalog,searches}.ts, apps/api/src/app.ts, apps/web/src/lib/{api,useCatalog,useSearch}.ts, apps/web/src/pages/{Search,Dashboard,ProfileSetup}.tsx, apps/web/src/App.tsx, apps/web/src/styles.css, docs/api-contract.md

## D-013 | 2026-11-13 18:45 | M4 match list from one ranked SQL query
- Context: M4 lists groups that pass all six rules; new M2 groups had no owner membership, so the query counted them as 0 members and skipped the owner in the gender check.
- Decision: services/matching.ts runs docs/match-groups.sql with bound parameters; POST /api/searches now returns the ranked matches and GET /api/searches/:id/matches re-runs a saved search (404 for unknown, non-uuid or another traveller's id); ranking is shared interests, shared nights, budget gap, check-in, id (P3); createGroup saves the owner as an approved member in one transaction and migration 0005 backfills older groups (P1); /search/:id shows each match with a reason line.
- Rejected: matching in JavaScript (slower, and the SQL was already cross-checked), counting the owner separately in SQL (two code paths for seeded and new groups), a weighted score (harder to explain at the demo).
- Why: one tested query gives correct results, and new groups match exactly like seeded ones.
- Trade-off / revisit if: no pagination (12 seeded groups); revisit ranking if judges ask for a score.
- Files: apps/api/src/services/matching.ts, apps/api/src/controllers/{searchController,groupController}.ts, apps/api/src/routes/searches.ts, apps/api/drizzle/0005_owner_memberships.sql, apps/api/drizzle/meta/*, apps/web/src/lib/{api,useSearch}.ts, apps/web/src/pages/{Search,Matches}.tsx, apps/web/src/App.tsx, apps/web/src/styles.css, docs/api-contract.md

## D-014 | 2026-11-13 19:30 | M6 hotel compare with a confirm-only Book popup
- Context: M6 criteria ask members to compare hotels for the group's city and dates with per-member cost, and say "No actual booking creation is needed"; the contract had also planned saved options and a stored, immutable booking (endpoints 21–25).
- Decision: build only GET /api/groups/:id/hotels (approved members only, 403 otherwise) with one SQL query: rooms = ceil(members / max_adults), every night check-in..check-out−1 needs rooms_left ≥ rooms, total = price × rooms × nights, per member = round(total / members, 2), recomputed on every call; the Book button opens a native <dialog> confirm and only shows a success message; context adds the city timezone; hotel photos and credits are served by the API.
- Rejected: storing a mock booking (not asked for, and it would lock the group), saved options (not in the criteria), pricing in JavaScript (a second copy of the availability rule).
- Why: matches the acceptance criteria exactly with the least code; the bookings and saved_options tables and endpoints 21–25 stay ready if booking is added later.
- Trade-off / revisit if: nothing records which hotel the group picked; revisit if mentors or a later milestone want a real booking.
- Files: packages/shared/src/index.ts, apps/api/src/{app.ts,routes/groupPage.ts,controllers/hotelController.ts,services/membership.ts,services/pricing.ts,validation/validateQuery.ts}, apps/web/src/{App.tsx,lib/api.ts,lib/useGroupPage.ts,pages/GroupPlan.tsx,pages/Dashboard.tsx,styles.css}, docs/api-contract.md
