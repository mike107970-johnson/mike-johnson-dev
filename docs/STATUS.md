# Delivery status

## Completed foundation

- Responsive mobile/desktop application shell and navigable core destinations
- Scores date navigation, normalized provider adapter, provider-status mapping, status-aware polling, loading, stale, empty and retry states
- Fixture-ID match routes and honest unsupported-data states
- WordPress newsroom integration
- My Feed, Vows TV, Predictor, Search, Notifications, Profile, Settings and Admin foundations
- Cookie choice, privacy, terms, support and account-deletion entry points
- Installable PWA manifest, offline shell and deep-link fallback
- Additive Supabase data model and ownership policies
- Server-side API key boundary, authentication hook, rate limits, validation, bounded retry/backoff, stale cache, quota metadata and request deduplication
- On-demand events, statistics, lineups, players and head-to-head match tabs
- Football cache/sync/request-log and notification-deduplication database model
- Capacitor production-origin configuration with no provider secret

## Pending credentials/integration

- Connect and regression-test the existing Supabase schema and Auth users
- Enable Google/email authentication and realtime community operations
- Validate every API-Football resource against the account's licensed leagues, seasons and quota
- Add supplied official brand artwork (none exists in this repository)
- Configure push providers, video storage, moderation service and prediction compute
- Add Stripe/Play Billing only after merchant setup
- Package and sign the Android application

## Known limitations

This first production foundation cannot prove live authentication, existing-data compatibility, licensed football coverage, push delivery or domain cutover without credentials and a staging backup. It deliberately displays unavailable states instead of demo data.
