# FootballVows football API on Cloudflare Workers

This Worker is the only component that contacts API-Football. It needs no Render service, Supabase project, database, or custom domain. The Android APK calls the generated `workers.dev` HTTPS URL. API-Football coverage still depends on the licensed provider plan.

## 1. Create Cloudflare and workers.dev

1. Create a free account at <https://dash.cloudflare.com/sign-up> and verify the email address.
2. In **Workers & Pages**, choose **Create application** and follow the prompt to register the account's `workers.dev` subdomain. The chosen account subdomain becomes part of URLs such as `https://footballvows-api.<account-subdomain>.workers.dev`.
3. Install this repository with `npm install` using Node 20 or newer.
4. Authenticate Wrangler in a browser:

   ```bash
   npx wrangler login
   ```

For local Worker development, create an untracked `.dev.vars` file containing `API_FOOTBALL_KEY=` and the licensed key. `.dev.vars` must never be committed. Run `npm run worker:dev`. Local development is available at the URL Wrangler prints.

## 2. Store the secret and deploy

From the repository root, store the key as a Cloudflare encrypted secret. Type or paste its value only into Wrangler's interactive prompt:

```bash
npx wrangler secret put API_FOOTBALL_KEY --env production
npm run worker:deploy
```

Do **not** append the key to either command, put it in `wrangler.jsonc`, use a `PUBLIC_` variable, or add it to GitHub Actions logs. The non-secret provider host, base URL, Nairobi timezone, cache durations, allowed Capacitor origins, and public rate limit are in `wrangler.jsonc`.

Copy the exact `https://footballvows-api.<account-subdomain>.workers.dev` URL printed by the deployment.

## 3. Verify the deployment

Health is safe to call publicly and never returns the secret:

```bash
curl https://footballvows-api.<account-subdomain>.workers.dev/api/health
```

Confirm `"ok": true` and `"configured": true`. Then use a real calendar date covered by the subscription:

```bash
curl 'https://footballvows-api.<account-subdomain>.workers.dev/api/fixtures?date=2026-08-03'
```

An empty `data` array is a valid successful response when no matches are scheduled. Do not treat it as an outage.

## 4. Configure and rebuild Android

Open `public/config.js` and paste the copied URL into the **`window.FOOTBALLVOWS_CONFIG.footballApiOrigin`** field:

```js
window.FOOTBALLVOWS_CONFIG = Object.freeze({
  apiOrigin: 'https://app.footballvows.com',
  footballApiOrigin: 'https://footballvows-api.<account-subdomain>.workers.dev'
});
```

The angle-bracket example is documentation only; never build it unchanged. Use the exact URL Wrangler printed. Then synchronize and rebuild, because `config.js` is packaged inside the APK:

```bash
npm run check
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

Install `android/app/build/outputs/apk/debug/app-debug.apk` on the device. A **new APK is required every time the packaged `footballApiOrigin` changes**. Confirm `public/config.js` and `android/app/src/main/assets/public/config.js` are identical after sync.

## Endpoints

All endpoints are `GET`: `/api/health`, `/api/fixtures?date=YYYY-MM-DD`, `/api/fixtures/live`, `/api/fixtures/:fixtureId`, and fixture-scoped `/events`, `/statistics`, `/lineups`, `/players`, `/head-to-head`, and `/standings`. `OPTIONS` is supported for CORS preflight. Provider results are normalized before leaving the Worker; missing plan data is returned honestly and never fabricated.

## Troubleshooting

- **CORS:** Capacitor uses `https://localhost` (and some versions use `capacitor://localhost`). Both are allowed by default. Add other exact origins to `ALLOWED_ORIGINS` in `wrangler.jsonc`, separated by commas, and redeploy. Never use credentials with a wildcard origin.
- **401/403 from API-Football:** run `npx wrangler secret put API_FOOTBALL_KEY --env production` again, verify the subscription is active, and redeploy. The Worker converts provider authentication failures into safe errors.
- **404:** verify the copied `workers.dev` hostname and one of the documented `/api` paths. Fixture IDs must contain digits only.
- **429:** respect `Retry-After`. The Worker has a per-client public limit and API-Football has a separate subscription quota. Do not shorten live polling below the configured 25-second cache.
- **Provider-plan limitation:** events, lineups, players, statistics, standings, or head-to-head may be unavailable for a competition or plan. The app must show the unavailable state rather than substitute data.
- **Network errors:** open `/api/health` in the device browser, verify Android internet permission, ensure `footballApiOrigin` uses HTTPS and ends in `.workers.dev`, then rebuild the APK.
- **`configured: false`:** the secret is absent from the selected Worker environment. Store it with the exact production command above.
