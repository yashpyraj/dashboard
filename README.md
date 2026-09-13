# Alliance Dashboard

Stats, leaderboards and a fantasy league for a mobile strategy game — built on periodic CSV scan exports of player data, normalised into Postgres and served as a React dashboard.

`React 18` · `TypeScript` · `Vite` · `Supabase (Postgres + Deno Edge Functions)` · `Zustand` · `Recharts` · `Tailwind`

---

## What it does

Alliance rosters in this game are only visible as scan exports — a CSV snapshot of every player's power, merits and kill counts at a point in time. On their own the files are unusable: no history, no comparison, no way to answer "who actually contributed this season?"

This dashboard turns a pile of those snapshots into a queryable record.

### Alliance and player tracking

- **Leaderboards** — universal, per-alliance, and head-to-head alliance comparison
- **Season progress** — scans are stamped against a season window, so growth is measured over the season rather than all-time
- **Player history** — players are keyed by `lord_id`, so name changes and alliance transfers don't break their record
- **KvK final zone** — a dedicated view for end-of-season standings
- **Diagnostics** — surfaces players missing from a scan, or whose stats moved impossibly between scans

### Matchups

Build alliance-vs-alliance matchups by hand, or auto-generate balanced ones from current power distribution.

### Fantasy league

A drafting layer on top of the real data: events with a team size (6, 8 or 12), a cap of players per server (`max_per_server`), and rosters scored from the same scan stats that drive the leaderboards.

### Export

Any view can be exported to PNG or PDF (`html2canvas` + `jsPDF`) for posting back to the alliance Discord.

## Architecture

```
CSV scan export
      │
      ▼
supabase/functions/ingest-csv   Deno edge function — parses, upserts,
      │                          stamps generation + season window
      ▼
Postgres (9 migrations)         alliances · players · stats · fantasy_*
      │
      ▼
src/utils/queries.ts            typed query layer
      │
      ▼
Zustand store ──► 14 pages
```

Ingestion runs server-side in an edge function rather than the browser, so a scan of several thousand rows never has to round-trip through the client. `src/utils/chunking.ts` batches the upserts to stay inside statement limits.

Access is gated by an alliance PIN (`src/components/Auth`) rather than per-user accounts — the people using it already share a Discord, and nobody wanted to manage logins.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18, React Router, Tailwind |
| State | Zustand |
| Charts | Recharts |
| Motion | GSAP, Framer Motion |
| Backend | Supabase — Postgres, Storage, Deno Edge Functions |
| Parsing | PapaParse |
| Export | html2canvas, jsPDF |
| Build | Vite |

## Running locally

```sh
npm install
```

Create `.env`:

```sh
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# only needed for `npm run ingest` (CLI ingestion); never ship this to the client
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

```sh
npm run dev
```

Apply the schema by running the files in `supabase/migrations/` against your project in timestamp order, then deploy the ingest function:

```sh
supabase functions deploy ingest-csv
```

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Serve the build locally |
| `npm run lint` | ESLint |
| `npm run ingest` | Ingest a scan from the CLI instead of the UI |

## Project layout

```
src/
  pages/          14 route-level views
  components/
    Alliance/     leaderboard, analytics, season progress, diagnostics
    Fantasy/      team rosters and drafting
    Player/       player detail drawer
    Auth/         PIN gate and route protection
    UI/           DataTable, loading and error states
  store/          Zustand alliance store
  utils/          queries, CSV parsing, chunked upserts
  types/          database, fantasy, shared
supabase/
  functions/      ingest-csv edge function
  migrations/     9 SQL migrations
```

## Notes

Built for one alliance's own use, so a few things are deliberately narrow: the PIN gate assumes a trusted group, and the scan format is the one the game's export produces.
