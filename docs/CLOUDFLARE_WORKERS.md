# FootballVows Cloudflare Worker deployment

FootballVows Android uses this production data flow:

`Android APK → Cloudflare Worker → API-Football`

News uses `Android APK → https://footballvows.com/wp-json/wp/v2/posts`. Do not use `https://app.footballvows.com` as the Android football backend.

## Deploy the Worker

1. Create or open a Cloudflare account at `https://dash.cloudflare.com`.
2. Install dependencies locally with `npm ci`.
3. Log in with `npx wrangler login`.
4. Make sure your account has a workers.dev subdomain in **Workers & Pages → Overview → workers.dev**.
5. Deploy from this repository with `npx wrangler deploy`.
6. Copy the deployed URL, for example `https://footballvows-api.your-subdomain.workers.dev`.

## Add the API-Football secret

Run:

```sh
npx wrangler secret put API_FOOTBALL_KEY
```

Paste your API-Football key only into Wrangler's encrypted prompt. Never put the key in `public/`, `android/`, GitHub Actions, documentation, logs, APK assets, or commits.

## Test the Worker

```sh
curl https://footballvows-api.your-subdomain.workers.dev/api/health
curl "https://footballvows-api.your-subdomain.workers.dev/api/fixtures?date=2026-08-05"
curl https://footballvows-api.your-subdomain.workers.dev/api/fixtures/live
```

`/api/health` returns whether the Worker is available and whether `API_FOOTBALL_KEY` is configured. Fixture endpoints return normalized FootballVows objects, not raw provider shapes. Some tabs may return an unavailable state when your API-Football plan does not include that resource.

## Configure Android

Set the public, non-secret Worker origin before building:

```sh
PUBLIC_API_ORIGIN=https://footballvows-api.your-subdomain.workers.dev npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

For GitHub Actions, create repository variable `PUBLIC_API_ORIGIN` with the same workers.dev URL. Do not create an `API_FOOTBALL_KEY` GitHub secret for APK builds; the key belongs only in Cloudflare Worker secrets.

Install the debug APK from `android/app/build/outputs/apk/debug/app-debug.apk` or the workflow artifact named `FootballVows-debug-apk`.

## Troubleshooting

- 404: confirm the URL is the Worker URL and includes `/api/...`.
- CORS: keep `ALLOWED_ORIGINS` including `https://localhost` and `capacitor://localhost`.
- Provider not configured: add `API_FOOTBALL_KEY` with `wrangler secret put`.
- Rate limited: retry later or review API-Football plan limits.
- Resource unavailable: the current API-Football plan may not include lineups, players, statistics, standings, or head-to-head for that fixture.
- Android says backend not configured: set `PUBLIC_API_ORIGIN`, run `npm run build`, then `npx cap sync android` and rebuild the APK.
