# FootballVows

FootballVows is a mobile-first football scores, journalism, community and statistical-forecast platform. The browser and Android wrapper consume a provider-independent FootballVows API; only the server adapter communicates with API-Football.

## Run locally

```bash
cp .env.example .env
npm start
```

Open the development server URL printed by `npm start`. Without provider credentials the app intentionally shows honest unavailable states—never invented fixtures or statistics.

## Configure

1. Back up the existing Supabase project before applying changes.
2. Run the additive Supabase migrations through `003_content_preferences.sql` in a staging project, inspect the policies, and only then apply them to production.
3. Set `FOOTBALL_DATA_PROVIDER=api_football`, `API_FOOTBALL_KEY`, `API_FOOTBALL_HOST` and `API_FOOTBALL_BASE_URL` in protected server secrets. The key is never sent to the browser or Android bundle.
4. Set the public Supabase URL and anon key. Never expose `SUPABASE_SERVICE_ROLE_KEY`.
5. Add the production and preview callback URLs in Supabase Google OAuth.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md), [`docs/ANDROID.md`](docs/ANDROID.md), [`docs/GOOGLE_PLAY.md`](docs/GOOGLE_PLAY.md), and the honest [`docs/CORRECTIVE_STATUS.md`](docs/CORRECTIVE_STATUS.md) verification/deployment report.

## Commands

```bash
npm test
npm run check
npm run build
```

## Football API

Public read endpoints live below `/api/football`; see [`docs/FOOTBALL_DATA.md`](docs/FOOTBALL_DATA.md) for endpoints, cache policy, quota planning, troubleshooting and provider-plan limitations. Provider data is normalized in `lib/football/contracts.mjs`, so another licensed adapter can be introduced without changing the interface.
