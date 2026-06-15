# Impressions SEO

A local-search command center for **Impressions In Ink** (Portland + San Diego).
The flagship feature is a **Google Maps geo-grid rank tracker**: run a scan and
it drops a grid of points around a location, checks your Maps rank for a keyword
at each point, and renders a clickable heatmap so you can see exactly where you
win and where competitors own the map.

> Renamed from the working title "Local Dominator" — that name belongs to an
> existing commercial product (localdominator.co). The geo-grid rank-tracking
> *concept* is a common category (Local Falcon, Local Viking, GMB Crush, etc.);
> this is an independent implementation under a distinct name.

## Quickstart

```bash
npm install
cp .env.example .env.local   # defaults to the mock provider — no API key needed
npm run dev                  # http://localhost:3000
```

It runs immediately on the **mock** ranking provider: a deterministic model
seeded from your real GSC positions (strong near the shop, degrading with
distance). Nothing to configure to see the full UX.

## Going live

Flip one env var and add a key:

```env
RANKING_PROVIDER=google
NEXT_PUBLIC_RANKING_PROVIDER=google
GOOGLE_MAPS_API_KEY=your_key_here
```

Get the key from Google Cloud Console → enable **Places API (New)** → create an
API key. Each scan makes `size^2` Text Search calls biased to each grid point
(49 for a 7x7, 81 for a 9x9) and finds your business in the ranked results.

**Cost awareness.** Places Text Search is billed per request, so a single 9x9
scan is 81 billable calls. This is exactly why the commercial tools meter usage
with credits. Start with 5x5 while testing, and consider caching / scheduled
scans rather than ad-hoc runs for many keywords.

**Higher fidelity.** Places Text Search approximates the local pack but isn't
the literal map-pack algorithm. For closer parity, implement the
`RankingProvider` interface (`src/lib/ranking/provider.ts`) against a SERP API
that returns Google Maps results by coordinate (SerpApi `google_maps`, or
DataForSEO). It's a single new file plus a branch in `getProvider()`.

## How it's organized

```
src/
  app/
    page.tsx              Dashboard (location/keyword/size + heatmap)
    api/scan/route.ts     POST — run a geo-grid scan
    api/locations/route.ts GET — seeded locations
  lib/
    grid.ts               Build grid coordinates
    scan.ts               Orchestrate a scan (size^2 lookups, batched)
    store.ts              Persist scans (JSON file; swap for Postgres)
    ranking/
      provider.ts         The RankingProvider interface
      mock.ts             Deterministic model (default, no key)
      google-places.ts    Live Google Places provider
      index.ts            Provider factory (RANKING_PROVIDER env)
    types.ts
  components/
    GeoGrid.tsx           The heatmap + pin detail
    theme.ts              Color tokens + rank color scale
  data/
    seed.ts               Both locations, keywords (real GSC baselines), competitors
```

## Storage & deploy

The default store writes scans to `.data/scans.json` — ideal for **local dev or
self-hosting** (a VPS, or one of your Pis). On **Vercel/serverless** the
filesystem is read-only, so implement `saveScan` / `listScans` in `store.ts`
against Postgres (Neon or Vercel Postgres) before deploying there.

## Roadmap (port from the single-file prototype / build next)

- **Auth + multi-tenant** (NextAuth + per-client workspaces) — required before
  this becomes a Make Ready offering for other print shops.
- **Recurring scans** (cron) with scan-over-scan comparison.
- **SERP tracker** and **AI-answer tracker** tabs.
- **Review velocity** tracker (the gap calculator from the prototype).
- **Shareable read-only report links** and white-label PDF export.

## License / note

Independent code. "Local Dominator" and other named tools are trademarks of
their respective owners; if this is ever offered to clients, keep the name and
branding distinct and confirm with counsel.
