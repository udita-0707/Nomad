# Nomad API contract (M1 to M6)

This file is the contract between the frontend and the backend, and between teammates building in parallel. Build to it exactly. To change a path, a field or a status code, edit this file first in its own small PR and say so in the team chat, then change the code. Types live in `packages/shared/src/index.ts` under the names given here; keep both in sync.

Status: **Built** = on main and working. **Planned** = agreed shape, not built yet.

## Proposed choices (confirm before building)

These four defaults are used below. They are marked "proposed – confirm" where they appear.

| # | Choice | Where it matters |
| - | ------ | ---------------- |
| P1 | The group owner is stored as an **approved** row in `group_memberships`. `membersCount` always includes the owner. | Group size rule, gender rule, `POST /api/groups` |
| P2 | A join request carries the `searchId` it came from, and the server **re-checks all six rules** before saving it. | `POST /api/groups/:id/requests` |
| P3 | Matches are ranked by most shared interests, then most shared nights, then smallest budget difference, then earliest check-in, then group id. | `POST /api/searches` |
| P4 | **Any approved member** can book, once the group has **at least 2** approved members. | `POST /api/groups/:id/booking` |

P1 needs one change to built code: `createGroup` must insert the owner's approved membership in the same transaction as the group (the seeded groups already have it).

## Conventions

- Base path `/api`. Bodies are JSON. Dates are `YYYY-MM-DD` strings in the destination city's local time, between `2027-04-01` and `2027-04-20`, with check-out after check-in. Nights = check-out minus check-in; the check-out day is not a night.
- Money is whole INR as a number. Per-member amounts are numbers rounded to 2 decimals.
- Ids are strings: users are uuids; travellers are `T-001` (seeded) or a uuid; groups are `G-01` (seeded) or `G-xxxxxxxx`; searches and saved options are uuids; bookings are `BK-XXXXXXXX`.
- Timestamps are ISO 8601 strings in UTC.
- Bodies are validated with the Zod schema named on each endpoint, before the controller runs. Query strings use the same approach (`validateQuery`, to add with M3).
- **Auth.** `no` = public. `yes` = needs the `sid` cookie (httpOnly, SameSite=Lax, Secure in production, 7 days); without it, 401 `UNAUTHENTICATED`. `traveller` = `yes`, and the user must also have a traveller profile; without it, 422 `PROFILE_REQUIRED`. `owner` and `member` = `traveller`, and the caller must be the group's owner, or an approved member (the owner counts); otherwise 403 `FORBIDDEN`.
- The frontend sends requests with `credentials: 'include'`.

## Error format

Every error response has this shape (`ErrorResponse`):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request body", "fields": { "email": "Invalid email" } } }
```

`message` is safe to show to the user. `fields` appears only with `VALIDATION_ERROR`.

| code | status | when | status |
| ---- | ------ | ---- | ------ |
| VALIDATION_ERROR | 400 | Body or query fails Zod; `fields` names each bad field | Built |
| INVALID_CREDENTIALS | 401 | Wrong email or password | Built |
| UNAUTHENTICATED | 401 | No valid session | Built |
| FORBIDDEN | 403 | Signed in, but not the owner or a member this endpoint needs | Planned |
| NOT_FOUND | 404 | Unknown route, or unknown id (also used for another user's search) | Built |
| EMAIL_TAKEN | 409 | Signup email already used | Built |
| USERNAME_TAKEN | 409 | Username already used | Built |
| USERNAME_UPDATE_LIMIT_REACHED | 409 | Second username change | Built |
| ALREADY_REQUESTED | 409 | Caller already has a row for this group (owner, member, pending or rejected) | Planned |
| NOT_A_MATCH | 409 | The group no longer passes the six rules for this search; `message` names the rule | Planned |
| NOT_PENDING | 409 | Approving, rejecting or cancelling a request that is not pending | Planned |
| GROUP_FULL | 409 | Approving would exceed `maxSize` | Planned |
| GROUP_BOOKED | 409 | The group is booked: no new requests, approvals or saved options | Planned |
| NOT_AVAILABLE | 409 | That room is not free on every night for the rooms needed | Planned |
| ALREADY_SAVED | 409 | This member already saved this room | Planned |
| NOT_ENOUGH_MEMBERS | 409 | Booking with fewer than 2 approved members (P4) | Planned |
| ALREADY_BOOKED | 409 | The group already has its one booking | Planned |
| PROFILE_REQUIRED | 422 | The endpoint needs a traveller profile and there is none | Built |
| INTERNAL | 500 | Anything else | Built |

Add each planned code to the `ErrorCode` union when you build the endpoint that throws it.

## Endpoint index

| # | Method and path | Auth | Milestone | Status | Owner lane |
| - | --------------- | ---- | --------- | ------ | ---------- |
| 1 | GET /api/health | no | infra | Built | – |
| 2 | POST /api/auth/signup | no | M1 | Built | – |
| 3 | POST /api/auth/login | no | M1 | Built | – |
| 4 | POST /api/auth/logout | cookie | M1 | Built | – |
| 5 | GET /api/auth/me | yes | M1 | Built | – |
| 6 | PATCH /api/auth/profile/username | yes | M1 (extra) | Built | – |
| 7 | GET /api/dashboard | yes | M1 | Built | – |
| 8 | GET /api/profile | yes | M1 | Built | – |
| 9 | PUT /api/profile | yes | M1 | Built | – |
| 10 | GET /api/catalog | no | M1 to M3 | Built | A |
| 11 | POST /api/groups | traveller | M2 | Built (needs P1) | B |
| 12 | GET /api/groups/mine | traveller | M2, M5 | Built (extend) | B |
| 13 | GET /api/groups/:id | traveller | M2, M4, M6 | Planned | B |
| 14 | POST /api/searches | traveller | M3, M4 | Built (M3: saves; matches in M4) | A |
| 15 | GET /api/searches/:id/matches | traveller | M4 | Planned | A |
| 16 | POST /api/groups/:id/requests | traveller | M5 | Planned | B |
| 17 | GET /api/groups/:id/requests | owner | M5 | Planned | B |
| 18 | PATCH /api/groups/:id/requests/:travellerId | owner | M5 | Planned | B |
| 19 | DELETE /api/groups/:id/requests/me | traveller | M5 | Planned | B |
| 20 | GET /api/groups/:id/hotels | member | M6 | Planned | C |
| 21 | POST /api/groups/:id/saved-options | member | M6 | Planned | C |
| 22 | GET /api/groups/:id/saved-options | member | M6 | Planned | C |
| 23 | DELETE /api/groups/:id/saved-options/:optionId | member | M6 | Planned | C |
| 24 | POST /api/groups/:id/booking | member | M6 | Planned | C |
| 25 | GET /api/groups/:id/booking | member | M6 | Planned | C |

## Shared objects

### PublicUser (built)

```json
{ "id": "uuid", "email": "a@b.com", "username": "sunny-otter-0427", "usernameEditCount": 0, "createdAt": "2026-11-13T07:00:00.000Z" }
```

### Profile (built)

```json
{
  "name": "Sarah",
  "gender": "FEMALE",
  "homeCity": "Bengaluru",
  "interests": ["TEMPLES", "STREET_FOOD", "PHOTOGRAPHY", "BUDGET_STAYS"],
  "genderPreference": "SAME_GENDER",
  "updatedAt": "2026-11-13T07:00:00.000Z"
}
```

`gender`: `FEMALE` | `MALE`. `homeCity`: `Bengaluru` | `Chennai` | `Delhi` | `Mumbai`. `interests`: 1 or more of the 16 ids in `INTERESTS`, with no repeats. `genderPreference`: `ANY` | `SAME_GENDER`.

### Group (built)

```json
{
  "id": "G-1a2b3c4d",
  "ownerId": "T-001",
  "name": "Kyoto Spring Temples",
  "city": "Kyoto",
  "checkIn": "2027-04-10",
  "checkOut": "2027-04-15",
  "maxSize": 3,
  "budgetInr": 60000,
  "itinerary": "Fushimi Inari at sunrise...",
  "createdAt": "2026-11-13T07:00:00.000Z"
}
```

`city`: one of `DESTINATION_CITIES` (Tokyo, Kyoto, Osaka, Dubai, Abu Dhabi). `maxSize` is the total number of people, owner included, from 2 to 4.

### GroupSummary (planned): `Group` plus

```json
{ "ownerName": "Sarah", "nights": 5, "membersCount": 1, "pendingCount": 0, "booked": false }
```

`pendingCount` is the number of pending requests. It is filled only when the caller is the owner; otherwise it is `0`.

### MemberCard (planned)

```json
{ "id": "T-002", "name": "Priya", "age": 27, "gender": "FEMALE", "homeCity": "Mumbai", "interests": ["TEMPLES", "STREET_FOOD", "ADVENTURE"] }
```

`age` is `null` for signed-up users until the profile form sends it.

## Endpoints

### 1. GET /api/health (built)

Response 200 `HealthResponse`: `{ "status": "ok", "db": "up" | "down" }`. Always 200.

### 2. POST /api/auth/signup (built)

- **Body** (`signupRequestSchema`): `{ "email": "a@b.com", "password": "8 to 72 chars", "username": "optional, 3 to 24 of a-z A-Z 0-9 _ -" }`.
- **Response 201** `UserResponse`: `{ "user": PublicUser }`. Also sets the `sid` cookie.
- **Errors:** 400 `VALIDATION_ERROR`, 409 `EMAIL_TAKEN`, 409 `USERNAME_TAKEN`.
- Without a username, the server assigns `adjective-noun-NNNN`.

### 3. POST /api/auth/login (built)

- **Body** (`loginRequestSchema`): `{ "email", "password" }`.
- **Response 200**: `{ "user": PublicUser }`. Also sets the cookie.
- **Errors:** 400, 401 `INVALID_CREDENTIALS`. A wrong password and an unknown email give the same message.

### 4. POST /api/auth/logout (built)

Response 204. Deletes the session and clears the cookie. Works without a cookie.

### 5. GET /api/auth/me (built)

Response 200 `{ "user": PublicUser }`. Errors: 401 `UNAUTHENTICATED`.

### 6. PATCH /api/auth/profile/username (built)

- **Body** (`updateUsernameRequestSchema`): `{ "username": "new-name" }`.
- **Response 200**: `{ "user": PublicUser }`.
- **Errors:** 400, 401, 409 `USERNAME_TAKEN`, 409 `USERNAME_UPDATE_LIMIT_REACHED`. A user can change their username once.

### 7. GET /api/dashboard (built)

Response 200 `DashboardResponse`: `{ "user": PublicUser, "options": ["group_creator", "group_seeker"] }`.

Planned, and additive: `"hasProfile": true | false`.

### 8. GET /api/profile (built)

Response 200 `ProfileResponse`: `{ "profile": Profile | null }`. It is `null` until the first PUT.

### 9. PUT /api/profile (built)

- **Body** (`profileRequestSchema`): `{ "name", "gender", "homeCity", "interests": [], "genderPreference": "ANY" }`. `genderPreference` defaults to `ANY`.
- **Response 200**: `{ "profile": Profile }`. The first call creates the traveller; later calls replace it.
- **Errors:** 400, 401.
- Planned, and additive: an optional `age` (an integer from 18 to 120). The server sets `home_airport` from `homeCity` (Bengaluru BLR, Chennai MAA, Delhi DEL, Mumbai BOM).

### 10. GET /api/catalog (built, lane A)

Response 200 `CatalogResponse`:

```json
{
  "destinationCities": [{ "name": "Kyoto", "countryCode": "JP", "timezone": "Asia/Tokyo" }],
  "departureCities": [{ "city": "Bengaluru", "airport": "BLR" }],
  "interests": [{ "id": "TEMPLES", "label": "Temples and shrines", "category": "CULTURE" }],
  "dateWindow": { "from": "2027-04-01", "to": "2027-04-20" }
}
```

The server reads the 4 reference tables once and caches them in memory. The search form takes its cities and interest labels from here.

### 11. POST /api/groups (built, needs P1)

- **Body** (`groupCreateRequestSchema`):

  ```json
  { "name": "Kyoto Spring Temples", "city": "Kyoto", "checkIn": "2027-04-10", "checkOut": "2027-04-15", "maxSize": 3, "budgetInr": 60000, "itinerary": "optional, up to 2000 chars" }
  ```

- **Response 201** `GroupResponse`: `{ "group": Group }`.
- **Errors:** 400 `VALIDATION_ERROR`, 401, 422 `PROFILE_REQUIRED`.
- **Logic (proposed – confirm, P1):** in one transaction, insert the group and the owner's `group_memberships` row with `status 'approved'` and `decided_at now()`.

### 12. GET /api/groups/mine (built, extend)

- **Response 200** `GroupsResponse`. Built today: `{ "groups": Group[] }`, the groups the caller owns, newest first.
- **Planned additions:**
  - Each item becomes a `GroupSummary`. That adds fields only, so existing code keeps working.
  - Two new lists sit beside `groups`, each newest first:

  ```json
  { "groups": [GroupSummary], "joined": [GroupSummary], "requested": [GroupSummary & { "requestStatus": "pending" | "rejected" }] }
  ```

  - `joined` holds groups where the caller is an approved member but not the owner.
- **Errors:** 401, 422 `PROFILE_REQUIRED`.

### 13. GET /api/groups/:id (planned, lane B)

- **Response 200** `GroupDetailResponse`:

  ```json
  {
    "group": GroupSummary,
    "owner": MemberCard,
    "members": [MemberCard],
    "myStatus": "owner" | "approved" | "pending" | "rejected" | "none"
  }
  ```

- `members` lists every approved member, owner included (P1). Any signed-in traveller can read this, because seekers look at a group before they request to join.
- **Errors:** 401, 404 `NOT_FOUND`, 422.

### 14. POST /api/searches (built in M3, matches added in M4, lane A)

M3 saves the search and returns `"matches": []`. M4 fills `matches` with the ranked results; the response shape does not change.

- **Body** (`searchRequestSchema`):

  ```json
  { "homeCity": "Mumbai", "city": "Kyoto", "checkIn": "2027-04-09", "checkOut": "2027-04-16", "interests": ["TEMPLES", "STREET_FOOD", "ADVENTURE"], "budgetInr": 62000, "genderPreference": "SAME_GENDER" }
  ```

  The seeker's gender comes from their profile. Values in this form apply to this search only and don't change the profile.

- **Response 201** `SearchResponse`:

  ```json
  {
    "search": { "id": "uuid", "homeCity": "Mumbai", "city": "Kyoto", "checkIn": "2027-04-09", "checkOut": "2027-04-16", "interests": [], "budgetInr": 62000, "gender": "FEMALE", "genderPreference": "SAME_GENDER", "createdAt": "..." },
    "matches": [Match]
  }
  ```

  `Match`:

  ```json
  {
    "groupId": "G-01", "name": "Kyoto Spring Temples", "city": "Kyoto", "checkIn": "2027-04-10", "checkOut": "2027-04-15",
    "membersCount": 1, "maxSize": 3, "ownerName": "Sarah",
    "sharedNights": 5, "sharedInterests": ["TEMPLES", "STREET_FOOD"], "budgetInr": 60000, "budgetDiffInr": 2000
  }
  ```

  No matches gives 201 with `"matches": []`.

- **Errors:** 400 (bad city, date outside the window, empty interests), 401, 422.
- **Rules.** The query lives in `docs/match-groups.sql`, and a group must pass all six rules:
  1. **Same city.**
  2. **At least 2 shared nights:** `LEAST(checkOut) - GREATEST(checkIn) >= 2`.
  3. **Budget:** `5 * |a - b| <= 2 * min(a, b)`.
  4. **At least 2 interests shared with the owner.**
  5. **Gender (D-009):** checked both ways against every approved member.
  6. **Not full:** `membersCount + 1 <= maxSize`.
- **Also excluded:** booked groups, and any group where the caller already has a row.
- **Ranking (proposed – confirm, P3):** `sharedInterests` count descending, `sharedNights` descending, `budgetDiffInr` ascending, `checkIn` ascending, `groupId` ascending.

### 15. GET /api/searches/:id/matches (planned, lane A)

- Response 200, same shape as endpoint 14. It runs the stored search again, so the results reflect groups that have filled or been booked since.
- **Errors:** 401, 404 if the search belongs to another traveller, 422.

### 16. POST /api/groups/:id/requests (planned, lane B)

- **Body** (`joinRequestSchema`): `{ "searchId": "uuid" }`.
- **Response 201** `JoinRequestResponse`: `{ "request": { "groupId": "G-01", "travellerId": "T-002", "status": "pending", "requestedAt": "..." } }`.
- **Errors:**
  - 400, 401, 422.
  - 404: unknown group, or a search that isn't the caller's.
  - 409 `ALREADY_REQUESTED`, 409 `GROUP_BOOKED`.
  - 409 `NOT_A_MATCH` (proposed – confirm, P2): the server runs the six rules again for this group with the search's values.

### 17. GET /api/groups/:id/requests (planned, lane B)

- **Query:** `status=pending` (default) or `status=all`.
- **Response 200** `JoinRequestsResponse`, oldest first:

  ```json
  { "requests": [{ "traveller": MemberCard, "status": "pending", "requestedAt": "...", "sharedInterests": ["TEMPLES", "STREET_FOOD"], "search": { "checkIn": "2027-04-09", "checkOut": "2027-04-16", "budgetInr": 62000 } }] }
  ```

  `search` is `null` if the search has been deleted.

- **Errors:** 401, 403 `FORBIDDEN` (not the owner), 404, 422.

### 18. PATCH /api/groups/:id/requests/:travellerId (planned, lane B)

- **Body** (`decideRequestSchema`): `{ "status": "approved" | "rejected" }`.
- **Response 200**: `{ "request": { "groupId", "travellerId", "status", "requestedAt", "decidedAt" } }`.
- **Errors:** 400, 401, 403, 404, 409 `NOT_PENDING`, 409 `GROUP_FULL`, 409 `NOT_A_MATCH` (the gender rule fails against current members), 409 `GROUP_BOOKED` (on approve only), 422.
- **Approve logic:** in one transaction:
  - Lock the group row with `SELECT ... FOR UPDATE`.
  - The request must be pending.
  - Approved count + 1 must be `<= maxSize`.
  - Check the gender rule again against every approved member.
  - Set `approved` and `decidedAt`.
- **Reject** is allowed even after booking. Decisions are final.

### 19. DELETE /api/groups/:id/requests/me (planned, lane B)

Response 204. Deletes the caller's own pending request. Errors: 401, 404 (no request), 409 `NOT_PENDING`, 422.

### 20. GET /api/groups/:id/hotels (planned, lane C)

- **Query** (`hotelSearchQuerySchema`, all optional): `sort=perMember|rating|stars` (default `perMember`), `refundable=true`, `minStars=1..5`.
- **Response 200** `HotelOptionsResponse`:

  ```json
  {
    "context": { "city": "Kyoto", "checkIn": "2027-04-10", "checkOut": "2027-04-15", "nights": 5, "membersCount": 2 },
    "options": [{
      "hotel": { "id": "HTL-KYO-001", "name": "Gion Corner Hotel", "stars": 3, "rating": 8.4, "image": "url", "familyFriendly": false },
      "room": { "id": "RM-KYO-001-A", "name": "Twin Room", "type": "TWIN", "maxAdults": 2, "refundable": true, "pricePerNightInr": 4760 },
      "roomsNeeded": 1, "totalInr": 23800, "perMemberInr": 11900, "minRoomsLeft": 2
    }]
  }
  ```

- **Calculation:** follows DATA_DICTIONARY.md.
  - `roomsNeeded` = ceil(membersCount / maxAdults).
  - Keep a room only if `rooms_left >= roomsNeeded` on every night from check-in to the day before check-out.
  - `totalInr` = price per night × rooms × nights.
  - `perMemberInr` = total / members, rounded to 2 decimals.
  - Prices are computed on every call and never cached.
- **Errors:** 401, 403, 404, 422.

### 21. POST /api/groups/:id/saved-options (planned, lane C)

- **Body** (`saveOptionSchema`): `{ "roomId": "RM-KYO-001-A" }`.
- **Response 201** `SavedOptionResponse`: `{ "option": SavedOption }`.

  ```json
  { "id": "uuid", "hotel": { "id", "name", "stars", "rating", "image" }, "room": { "id", "name", "type" }, "roomsCount": 1, "nights": 5, "membersCount": 2, "totalInr": 23800, "perMemberInr": 11900, "savedBy": { "id": "T-001", "name": "Sarah" }, "createdAt": "..." }
  ```

  The server recomputes the price; it never takes a price from the client.

- **Errors:** 400, 401, 403, 404 (room not in this city), 409 `NOT_AVAILABLE`, 409 `ALREADY_SAVED`, 409 `GROUP_BOOKED`, 422.

### 22. GET /api/groups/:id/saved-options (planned, lane C)

- **Response 200** `SavedOptionsResponse`. Options are grouped by room, most votes first:

  ```json
  { "options": [{ "roomId": "RM-KYO-001-A", "hotel": {}, "room": {}, "totalInr": 23800, "perMemberInr": 11900, "votes": 2, "savedBy": [{ "id", "name", "optionId" }], "stale": false }] }
  ```

- `totalInr` and `perMemberInr` are recomputed for the current member count. `stale` is `true` when the member count has changed since an option was saved.
- **Errors:** 401, 403, 404, 422.

### 23. DELETE /api/groups/:id/saved-options/:optionId (planned, lane C)

Response 204. Only the member who saved the option can delete it. Errors: 401, 403, 404, 409 `GROUP_BOOKED`, 422.

### 24. POST /api/groups/:id/booking (planned, lane C)

- **Body** (`bookingRequestSchema`): `{ "roomId": "RM-KYO-001-A", "savedOptionId": "uuid, optional" }`. The frontend shows the confirm popup first; this call is the confirmation.
- **Response 201** `BookingResponse`:

  ```json
  { "booking": { "id": "BK-1A2B3C4D", "groupId": "G-01", "hotel": {}, "room": {}, "roomsCount": 1, "checkIn": "2027-04-10", "checkOut": "2027-04-15", "nights": 5, "membersCount": 2, "totalInr": 23800, "perMemberInr": 11900, "bookedBy": { "id": "T-001", "name": "Sarah" }, "createdAt": "..." } }
  ```

- **Errors:** 400, 401, 403, 404, 409 `NOT_ENOUGH_MEMBERS` (P4), 409 `NOT_AVAILABLE`, 409 `ALREADY_BOOKED`, 422.
- **Logic:**
  - Lock the group row.
  - **Proposed – confirm (P4):** any approved member may book, and there must be at least 2 approved members.
  - Recompute the price, then insert the booking.
  - `UNIQUE(group_id)` allows one booking per group. Triggers make the booking immutable and close the group to new requests and approvals (D-009).
  - `rooms_left` is not changed, because the catalog is read-only.

### 25. GET /api/groups/:id/booking (planned, lane C)

Response 200 `{ "booking": Booking | null }`. Errors: 401, 403, 404, 422.

## Ownership and parallel work

Lanes are split so that each person owns separate files. Lane B (groups and requests) also covers the P1 fix.

| Lane | Endpoints | Backend files they own | Frontend pages |
| ---- | --------- | ---------------------- | -------------- |
| A: search and matching | 10, 14, 15 | `routes/catalog.ts`, `routes/searches.ts`, `controllers/searchController.ts`, `services/matching.ts` | Search form, results |
| B: groups and requests | 11 to 13, 16 to 19 | `routes/groups.ts`, `controllers/groupController.ts`, `controllers/requestController.ts` | Create group, my groups, group detail, pending requests badge |
| C: Common Group Page | 20 to 25 | `routes/groupPage.ts` (mounted at `/api/groups/:id`, with `mergeParams`), `controllers/hotelController.ts`, `controllers/bookingController.ts`, `services/pricing.ts` | Group page, hotel list, saved options, book popup |

Rules that keep merges clean:

1. **Shared types.** In `packages/shared/src/index.ts`, each lane adds types only under its own heading (`// ---------- Lane A: search ----------` and so on). Add new `ErrorCode` values at the end of the union. Never rename an existing export.
2. **`app.ts`.** Each lane adds one `app.use` line for its router. Lane C's router mounts after lane B's.
3. **Shared helpers.** Lanes A and B share one membership check, `assertMember(groupId, travellerId)` in `services/membership.ts`, which also returns `myStatus`. Lane B writes it first. Lane C imports it.
4. **Matching.** Lane B's re-check (P2) calls lane A's `services/matching.ts` function `matchOneGroup(search, groupId)`. Until lane A ships it, lane B stubs it to return `true`.
5. **Schema.** The schema is frozen at migration 0004. If a lane needs a schema change, it goes in a new migration in its own PR and is logged in `docs/decisions.md`.
6. **Contract changes.** Change this file first, then the code.
