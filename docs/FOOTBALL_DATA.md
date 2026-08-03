# Live football data operations

## Architecture and security

The web PWA and Capacitor wrapper call only `/api/football`. `ApiFootballProvider` is the initial adapter and returns provider-neutral fixtures, statuses, events, statistics and lineups. API-Football credentials exist only in protected server environment variables. Do not prefix them with `PUBLIC_`, commit them, place them in Capacitor/Gradle resources, or expose them through `/api/config`.

Public read endpoints are IP-rate-limited and accept an optional verified Supabase bearer session. Manual refresh is POST-only, requires a verified administrator, and has a separate strict rate limit. For multi-instance production, replace the in-memory limiter/cache with shared Redis while retaining the same service interface.

## Endpoints

- `GET /api/football/fixtures?date=YYYY-MM-DD`
- `GET /api/football/fixtures/live`
- `GET /api/football/fixtures/:id`
- `GET /api/football/fixtures/:id/events`
- `GET /api/football/fixtures/:id/statistics`
- `GET /api/football/fixtures/:id/lineups`
- `GET /api/football/fixtures/:id/players`
- `GET /api/football/fixtures/:id/head-to-head`
- `GET /api/football/leagues?season=YYYY`
- `GET /api/football/leagues/:id/standings?season=YYYY`
- `GET /api/football/teams/:id`
- `GET /api/football/teams/:id/fixtures?season=YYYY`
- `GET /api/football/teams/:id/squad`
- `GET /api/football/players/:id?season=YYYY`
- `GET /api/football/search?q=Arsenal`
- `GET /api/football/status`
- `POST /api/football/admin/refresh` (admin only)

All successful results use `{ data, meta }`; errors use `{ error, meta }`. Metadata identifies the provider, timestamp, cache state, last successful update, stale/live/unavailable state and known quota. API-Football raw fixture JSON never reaches score components.

## Provider resources

The adapter supports API-Football `fixtures`, `fixtures/events`, `fixtures/statistics`, `fixtures/lineups`, `fixtures/players`, `fixtures/headtohead`, `leagues`, `standings`, `teams`, `players/squads`, `players`, `coachs`, `injuries`, `teams/statistics`, `players/topscorers`, `countries`, `leagues/seasons`, and gated `odds`. Availability depends on the paid plan, competition and season. Odds must remain disabled unless both licensing and applicable law permit them.

## Cache and refresh policy

Defaults are live 20 seconds, upcoming/date fixtures 300 seconds, finished 86,400 seconds, and slow resources 3,600 seconds. Configure values in seconds. Live client polling occurs only while the Scores view is visible, online, and contains a provider-confirmed live fixture. It stops when hidden, offline, away from Scores, or when no live match exists, and refreshes on foreground/network restoration.

The server deduplicates simultaneous cache misses so connected devices share one provider request. Stale-while-revalidate serves the most recent valid response for bounded transient failures. Authentication, quota, and legitimate empty-date responses remain distinct. For a plan with `Q` daily requests and an expected `L` hours of live coverage, a conservative minimum live interval is `ceil((L × 3600 × tracked_live_resources) / (0.8 × Q))`; use the larger of that result and 15 seconds. Reserve at least 20% for match tabs, standings and recovery.

## Competition selection

Use `football_competitions.enabled`, `featured` and `display_order`. Pin major leagues with lower display-order values. Select the preferred year in `football_seasons`; lower-priority competitions can remain searchable and sync on demand. Never infer a season solely from the current calendar year.

## Troubleshooting

- **No fixtures:** call `/api/football/status`. A `200` response with `data: []` and `meta.unavailable: true` is a legitimate empty date. `NOT_CONFIGURED`, `AUTHENTICATION_ERROR`, `RATE_LIMITED`, `TIMEOUT`, and `TEMPORARY_FAILURE` require different action.
- **Missing statistics:** coverage varies by competition and plan. The UI displays “Data unavailable”; do not substitute generated values.
- **Rate limits:** inspect `meta.quota`, increase refresh intervals, reduce enabled competitions and verify backend cache hits. Respect provider reset windows; retries are bounded exponential backoff.
- **Stale data:** `meta.stale: true` and `lastSuccessfulUpdate` identify the cached snapshot. Check provider health and request logs before manually refreshing.

## Verification

Run `npm test`, `npm run check`, and `npm run build`. With staging credentials, verify each endpoint and compare the selected Nairobi date to the provider console. Then background/foreground the PWA, confirm network polling stops/resumes, verify LIVE/HT labels against provider status, and validate a temporary provider outage returns cached data.

## Scores and match-details deployment

The Android bundle uses the absolute backend origin `https://app.footballvows.com` and never contacts API-Football directly. Configure these **hosting environment variables** (or repository/environment secrets consumed only by your hosting deployment), never Android build variables:

- `FOOTBALL_DATA_PROVIDER=api_football`
- `API_FOOTBALL_KEY` — the licensed API-Football key; required and server-only
- `API_FOOTBALL_HOST=v3.football.api-sports.io`
- `API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io`
- `API_FOOTBALL_TIMEZONE=Africa/Nairobi`
- `LIVE_REFRESH_INTERVAL=20`
- `UPCOMING_REFRESH_INTERVAL=300`
- `FINISHED_REFRESH_INTERVAL=86400`
- `FOOTBALL_CACHE_TTL=3600`

If deployment is performed by GitHub Actions, create an environment secret named `API_FOOTBALL_KEY` and pass it only to the hosting provider's secret/environment configuration step. Do **not** add it to the Android APK workflow: the APK does not need or use this secret. After deployment, verify `https://app.footballvows.com/api/health` reports `footballConfigured: true`; the health and config responses never return the key.

Public stable endpoints are `/api/fixtures`, `/api/fixtures/live`, `/api/fixtures/:fixtureId`, and the fixture subresources `/events`, `/statistics`, `/lineups`, `/players`, `/head-to-head`, and `/standings`. The existing `/api/football/fixtures` routes remain compatible. Availability of events, player ratings, lineups, expected goals, standings, injuries and other fields depends on the licensed competition and API-Football subscription. Missing fields are returned as unavailable and are never fabricated.
