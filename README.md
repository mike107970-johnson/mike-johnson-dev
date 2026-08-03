# FootballVows

FootballVows is a mobile-first football scores, journalism, community and statistical-forecast platform. This repository contains a dependency-free web/PWA foundation, a secure API-Football proxy, WordPress integration, and additive Supabase migrations.

## Run locally

```bash
cp .env.example .env
npm start
```

Open <http://localhost:3000>. Without provider credentials the app intentionally shows honest unavailable states—never invented fixtures or statistics.

## Configure

1. Back up the existing Supabase project before applying changes.
2. Run `supabase/migrations/001_platform.sql` in a staging project, inspect the policies, and only then apply it to production.
3. Set `API_FOOTBALL_KEY` on the server. It is never sent to the browser.
4. Set the public Supabase URL and anon key. Never expose `SUPABASE_SERVICE_ROLE_KEY`.
5. Add the production and preview callback URLs in Supabase Google OAuth.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), [`docs/GOOGLE_PLAY.md`](docs/GOOGLE_PLAY.md), and [`docs/STATUS.md`](docs/STATUS.md).

## Commands

```bash
npm test
npm run check
```
