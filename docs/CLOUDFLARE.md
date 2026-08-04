# Cloudflare Worker football backend

The Worker in `worker/index.mjs` exposes the provider-neutral read-only football routes at both `/api/football/*` and the Scores aliases `/api/fixtures/*`. It also exposes `/api/health`. The existing application server remains responsible for authentication, profiles, News and Blogs; the client sends only football requests to the Worker.

## First deployment

1. Authenticate Wrangler with the Cloudflare account that will own the Worker:

   ```bash
   npx wrangler login
   ```

2. Create the provider key as an encrypted Worker secret. Enter the real value only at Wrangler's prompt:

   ```bash
   npx wrangler secret put API_FOOTBALL_KEY
   ```

   Never put the value in `wrangler.toml`, `.dev.vars`, Android resources, client configuration, CI logs, documentation or GitHub secrets that are copied into a client build.

3. Review `ALLOWED_ORIGINS` in `wrangler.toml`. It contains the production web application and the standard secure Capacitor origins. Add exact preview origins only when they are required; do not use `*`.

4. Deploy to the enabled `workers.dev` endpoint:

   ```bash
   npx wrangler deploy
   ```

5. Copy the hostname Wrangler reports (for example, `https://footballvows-football-api.<account-subdomain>.workers.dev`) into `footballApiOrigin` in `public/config.js`. Keep `apiOrigin` pointed at the application backend because it owns non-football APIs. Regenerate Android assets and verify them before producing an APK:

   ```bash
   npm run cap:sync
   cmp public/config.js android/app/src/main/assets/public/config.js
   ```

## Verification and operations

Run these checks without printing or interpolating the secret:

```bash
curl https://footballvows-football-api.<account-subdomain>.workers.dev/api/health
curl 'https://footballvows-football-api.<account-subdomain>.workers.dev/api/fixtures?date=2026-08-04'
npx wrangler tail
```

The health response reports only whether the secret exists. Rotate the credential with `npx wrangler secret put API_FOOTBALL_KEY`; redeploying source is not required. API-Football requests are made only by the Worker and normalized responses never contain the credential.

For local Worker development, use `npx wrangler dev`. If a local secret is necessary, store it in ignored `.dev.vars`; never commit that file. The in-memory cache is isolate-local, so Cloudflare may evict it at any time and the client must continue to handle fresh, stale and unavailable responses.
