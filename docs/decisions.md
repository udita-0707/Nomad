# Nomad decision log

Append-only: add new entries at the end and never rewrite old ones.

Entry format:

```
## D-NNN | YYYY-MM-DD HH:MM | Short title
- Context: what problem or gap this answers
- Decision: what we chose
- Rejected: alternative (why not), alternative (why not)
- Why: the main reason
- Trade-off / revisit if: what we give up, and when to change it
- Files: paths touched
```

## D-001 | 2026-11-13 13:34 | PostgreSQL via Docker for persistence
- Context: user, session and group data must survive server restarts.
- Decision: PostgreSQL 16 run locally with docker compose.
- Rejected: in-memory store (lost on restart), SQLite (differs from a hosted Postgres we may deploy to).
- Why: one command gives every teammate the same real database.
- Trade-off / revisit if: needs Docker installed; switch to a hosted Postgres (Neon) for deployment.
- Files: docker-compose.yml, .env.example

## D-002 | 2026-11-13 13:34 | Cookie sessions stored in the database, not JWT
- Context: we need login that survives page refreshes and a logout that really works.
- Decision: random 32-byte session id in an httpOnly cookie, with the session row in the sessions table, expiring after 7 days.
- Rejected: JWT (can't be revoked before it expires), localStorage tokens (readable by scripts, so open to XSS theft).
- Why: deleting the row revokes the session immediately.
- Trade-off / revisit if: one database lookup per protected request; revisit if traffic makes that slow.
- Files: apps/api/src/services/session.ts, apps/api/src/middleware/requireAuth.ts

## D-003 | 2026-11-13 13:34 | Backend owns matching, ranking and cost logic
- Context: matching travellers to groups, ranking results and costing trips must give the same answer everywhere.
- Decision: all matching, ranking and cost calculations live in the API; the frontend only displays results.
- Rejected: computing in the browser (logic duplicated, easy to tamper with).
- Why: one source of truth that can be tested in one place.
- Trade-off / revisit if: more API calls for small UI changes; revisit only for purely visual sorting.
- Files: apps/api/src

## D-004 | 2026-11-13 13:34 | Catalog data is read-only, loaded by a separate loader
- Context: destinations, hotels, rooms and availability come as fixed JSON files in data/catalog.
- Decision: a separate loader imports the catalog; the app only reads it and never writes to it.
- Rejected: editing catalog data through the API (not needed, and risks corrupting the provided dataset).
- Why: keeps the provided data intact and makes reloads repeatable.
- Trade-off / revisit if: catalog changes need a reload; revisit if the problem adds catalog editing.
- Files: data/catalog

## D-005 | 2026-11-13 13:34 | No AI or LLM calls inside the app
- Context: the event rules forbid AI or LLM calls in the product.
- Decision: all matching and ranking use plain, deterministic code.
- Rejected: LLM-based matching or recommendations (against the rules).
- Why: required by the event.
- Trade-off / revisit if: no fuzzy natural-language features; revisit only if the rules change.
- Files: none
