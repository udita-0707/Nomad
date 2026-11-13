# Nomad API contract (iteration 1)

Base path: `/api`. All bodies are JSON. Auth uses an httpOnly cookie (`sid`, httpOnly, SameSite=Lax, Secure in production, 7 days) set by the API; the frontend sends it with `credentials: 'include'`.
Types live in `packages/shared/src/index.ts`. Keep this file and that one in sync.

## Error format

Every error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "fields": { "email": "Invalid email" }
  }
}
```

| code                | status | when                                                      |
| ------------------- | ------ | --------------------------------------------------------- |
| VALIDATION_ERROR    | 400    | Body fails Zod validation (`fields` lists each bad field) |
| INVALID_CREDENTIALS | 401    | Wrong email or password on login                          |
| UNAUTHENTICATED     | 401    | No valid session cookie on a protected route              |
| NOT_FOUND           | 404    | Unknown route                                             |
| EMAIL_TAKEN         | 409    | Signup with an email that already exists                  |
| INTERNAL            | 500    | Anything else                                             |

## User object

```json
{
  "id": "uuid",
  "email": "a@b.com",
  "username": "sunny-otter-0427",
  "createdAt": "2026-11-13T07:00:00.000Z"
}
```

## Endpoints

| Method | Path             | Auth   | Request body                                                         | Success                                                        |
| ------ | ---------------- | ------ | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| GET    | /api/health      | no     | –                                                                    | 200 `{ "status": "ok", "db": "up" \| "down" }`                 |
| POST   | /api/auth/signup | no     | `{ "email", "password" }` (password 8–72 chars)                      | 201 `{ "user" }` + sets cookie                                 |
| POST   | /api/auth/login  | no     | `{ "email", "password" }`                                            | 200 `{ "user" }` + sets cookie                                 |
| POST   | /api/auth/logout | cookie | –                                                                    | 204, session deleted, cookie cleared                           |
| GET    | /api/auth/me     | yes    | –                                                                    | 200 `{ "user" }`                                               |
| GET    | /api/dashboard   | yes    | –                                                                    | 200 `{ "user", "options": ["group_creator", "group_seeker"] }` |
| GET    | /api/profile     | yes    | –                                                                    | 200 `{ "profile" }`, `profile` is `null` until saved           |
| PUT    | /api/profile     | yes    | `{ "name", "gender", "homeCity", "interests", "genderPreference"? }` | 200 `{ "profile" }` (creates or replaces)                      |

## Usernames

Assigned by the API at signup: `adjective-noun-NNNN` (e.g. `brave-falcon-0815`). Unique in the database; the API retries with a new name on conflict.

## Profile (M1)

```json
{
  "name": "Priya Shah",
  "gender": "FEMALE",
  "homeCity": "Mumbai",
  "interests": ["TEMPLES", "STREET_FOOD"],
  "genderPreference": "SAME_GENDER",
  "updatedAt": "2026-11-13T08:17:41.766Z"
}
```

- `gender`: `FEMALE` or `MALE`. `homeCity`: `Bengaluru`, `Chennai`, `Delhi` or `Mumbai`. `interests`: 1 or more unique ids from `data/problem-3/interests.json`. `genderPreference`: `ANY` (default) or `SAME_GENDER`.
- The allowed values live in `packages/shared` (`GENDERS`, `HOME_CITIES`, `INTERESTS`, `GENDER_PREFERENCES`) and match `data/problem-3/travellers.json`, so new users can be matched with the seeded travellers.
- Invalid values return 400 `VALIDATION_ERROR` with `fields`.
