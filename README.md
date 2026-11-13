# Hackathon data pack: Problem 3: Group Travel Matcher

Everything your team needs for this problem.

## Start here

| Step | Read | Why |
|---|---|---|
| 1 | `problem-3-group-travel-matcher.md` | The problem statement: what to build, the rules, and how we judge |
| 2 | `DATA_DICTIONARY.md` | What each data file is, how the files link, every field, a worked example, and a data FAQ |
| 3 | `data/` | The mock data (below) |

## The data in this pack

| File | One record is | Your app uses it to |
|---|---|---|
| `data/problem-3/travellers.json` | One traveller profile | Users who already exist at the start. Group owners and members come from here. |
| `data/problem-3/groups.json` | One open group post | Group posts that already exist at the start, so a search has results (M4) |
| `data/problem-3/interests.json` | One interest tag | The interest list in the sign-up form (M1) and the search form (M3) |
| `data/catalog/destinations.json` | The list of cities and countries | The city list in the group post form (M2) and the search form (M3) |
| `data/catalog/hotels.json` | One hotel | Hotel search on the Common Group Page (M6) |
| `data/catalog/rooms.json` | One room type in one hotel | Room capacity and price per night (M6) |
| `data/catalog/availability.json` | One room type on one night | Free rooms on each night of the group's stay (M6) |
| `images/hotels/` | One hotel photo (JPG) | Show hotel photos (optional). Credits: `images/ATTRIBUTIONS.md`. |

All data is synthetic, except the photos (real photos with free licenses; see `images/ATTRIBUTIONS.md`). All times are local times. All prices are in INR. The data files are read-only: keep your own data in your own database.

## Rules (short version)

1. Any language, framework, and database. AI tools to help you write code are allowed. **Your app must not call an AI or LLM model.**
2. Build a **backend** and a **frontend** that work together. The frontend gets data from your backend, not from the files.
3. Do not change the data files. Judges use the same files.
4. Write feature code during the event. Push to Git every hour.
5. Your app must start with 1–2 commands. Write them in your README.
6. At code freeze, upload a zip to HackerEarth (no `node_modules`, no virtual environments, no API keys).

## Questions

Read the FAQ at the end of `DATA_DICTIONARY.md` first. Then ask at the help desk or in the event chat channel. We send every answer to all teams.

## Running Nomad (our app)

You need Node 20.12+ and Docker.

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Before the first run, edit `.env`: Docker publishes Postgres on port **5440**, so set `DATABASE_URL=postgres://nomad:nomad@localhost:5440/nomad`, and set `PORT=4100`, which is where the Vite dev server sends `/api` calls.

Then open http://localhost:5173. http://localhost:5173/api/health should say the database is up.

## What works

- **M1** Sign up, sign in, and a traveller profile. Sessions are cookies stored in Postgres. You can change your username once.
- **M2** Owners post a group: city, dates, size, budget and plan.
- **M3, M4** Search for a trip and get matching groups ranked by shared interests, then shared nights, then budget.
- **G1** Filter matches by interests and group make-up. Filters live in the URL.
- **M5** Ask to join a group. The owner approves or declines, and both sides see the status.
- **G2** Open a member's profile from a group to see their interests and groups. No gender or contact details are shown.
- **M6** Members compare hotels for the group's city and dates, with the cost split per person, and book one. The booking is a mock: it's saved and every member sees it, but nothing is reserved.
- **S1** Group chat on the group page, for members only, before and after booking.
- **Booking.com hand-off** When no group matches your search, or nobody has joined your group yet, a "Book solo on Booking.com" button opens Booking.com search results in a new tab with your city, dates and 1 adult filled in. It's a plain link: nothing is sent to our API or saved.

## Known limitations

- Chat checks for new messages every 4 seconds. There's no unread badge, and messages can't be edited or deleted.
- Bookings can't be cancelled, and booking doesn't reduce the rooms left.

## Future scope

- A deeper Booking.com partner integration: live prices and availability in the app, and a real reservation in place of the mock booking.

For how the code is laid out, see [docs/ENGINEERING.md](docs/ENGINEERING.md).
