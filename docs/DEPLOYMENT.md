# Deployment and migration

## Safety first

Do not point `app.footballvows.com` at this build until staging acceptance passes. Export the current Supabase schema and data, preserve Auth users, storage and OAuth settings, and take a restorable database backup. The SQL migration is additive; review it for naming collisions with the existing schema.

## Required credentials

- API-Football server key
- Existing Supabase URL and public anon key
- Supabase service key for server-only administrative jobs (not required for the public shell)
- Google OAuth client configured in Supabase
- WordPress REST endpoint (defaults to the production FootballVows endpoint)
- Approved feed-aggregation URL and optional bearer token (`EXTERNAL_FEEDS_API_URL`, `EXTERNAL_FEEDS_TOKEN`)
- Public runtime `API_BASE_URL` generated into `public/config.js` (production: `https://api.footballvows.com`)

Set secrets in the hosting dashboard, not Git. Deploy a preview, run the test plan, add its OAuth callback URL, and confirm existing profiles and favourites before DNS changes. The server needs Node 20+, HTTPS, persistent environment configuration and a reverse proxy capable of forwarding all application routes.

## Domain cutover

1. Reduce DNS TTL in advance.
2. Validate the preview on mobile and desktop.
3. Retain the current FootballVows deployment as a rollback target.
4. Attach `app.footballvows.com`, verify TLS and update Supabase site/callback URLs.
5. Monitor `/api/health`, provider quotas, OAuth, error logs and cache behaviour.
