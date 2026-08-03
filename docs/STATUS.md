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
- Complete Capacitor Android project with packaged web assets, Gradle wrapper, native manifest, deep links, adaptive icons, splash theme and no provider secret
- FootballVows-branded Google/email authentication UI, PKCE OAuth callback, secure session cookies, route restoration, sign-out and account deletion
- Five-step, first-launch onboarding with provider search, multi-selection, offline result cache and a Settings reset
- Seven-day date window, previous/next controls, native date picker and persisted score tab/date
- Production-native `API_BASE_URL` resolution that prevents relative Android API requests
- Approved-publisher backend aggregation contract with normalisation, deduplication and stale-cache fallback

## Pending credentials/integration

- Apply the documented Google Cloud and hosted-authentication branding/callback settings, then regression-test existing users
- Verify Google/email authentication and realtime community operations with production credentials
- Validate every API-Football resource against the account's licensed leagues, seasons and quota
- Deploy `api.footballvows.com` and generate `public/config.js` with its HTTPS origin
- Add supplied official brand artwork (none exists in this repository)
- Configure approved external feeds, push providers, video storage, moderation service and prediction compute
- Add Stripe/Play Billing only after merchant setup
- Install the blocked Capacitor/Android dependencies, verify the debug build, and configure Play release signing outside Git

## Known limitations

This production foundation cannot prove live authentication, existing-data compatibility, licensed football coverage, push delivery or domain cutover without credentials and a staging backup. The native Android project is committed, but this environment blocks npm, Gradle distribution and Maven/Android dependency downloads with HTTP 403 responses, so a debug APK could not be compiled here. The application deliberately displays unavailable states instead of demo data.
