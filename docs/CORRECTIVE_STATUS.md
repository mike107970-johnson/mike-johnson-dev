# Corrective delivery status

## Fully implemented in this repository

- Five-screen first-launch onboarding with original SVG/CSS artwork, provider-backed team/league/player choices, multi-selection, search, local persistence, cached choices, retry/skip controls and authenticated preference sync.
- Five-item mobile navigation: Scores, News, My Feed, Blogs and Vows TV; Profile is available from the circular top-right avatar on every shared application screen.
- Existing Google/email authentication, registration, password recovery, secure session restoration, sign-out and delete-account request, plus profile/settings links.
- Absolute, validated native API origin, startup health check, safe diagnostic origin logging, timeouts/retries and cached content fallback.
- Normalized FootballVows News with backend-first retrieval, direct WordPress fallback, pagination, category filters, refresh/pull gesture, three-minute checks, offline cache, deduplication, bookmarks, sharing and secure original links.
- Attributed external Blogs summaries through server-side Google News RSS search, ten-minute server caching, filters, follow/hide controls, bookmarks, sharing and original-source links.
- Calendar date reload, live fixture route, provider search, admin-gated video upload visibility and explicit unavailable/configuration states.

## Requires deployed services

- Live fixtures, team/league/player onboarding data and match tabs require a deployed FootballVows backend with `API_FOOTBALL_KEY` and sufficient API-Football coverage/quota.
- Authentication and cross-device preference/bookmark sync require the existing Supabase project, migration `003_content_preferences.sql`, configured OAuth and production redirect URLs.
- Vows TV playback/upload requires `videos`, a configured `SUPABASE_VIDEO_BUCKET`, storage RLS policies and an administrator ID in `ADMIN_USER_IDS`. Until then the UI states the missing configuration and does not show Upload video to ordinary users.
- Blogs require the deployed backend to reach Google News RSS or another approved feed. The Android app never calls external Blog feeds directly.
- Push notifications require Firebase/FCM configuration and are not activated by this corrective patch.

## Required protected environment variables

`PUBLIC_APP_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (account deletion/server administration only), `ADMIN_USER_IDS`, `API_FOOTBALL_KEY`, `API_FOOTBALL_BASE_URL`, `API_FOOTBALL_HOST`, `API_FOOTBALL_TIMEZONE`, `WORDPRESS_API_URL`, refresh/cache intervals, and optionally `BLOG_BLOCKED_PUBLISHERS` and `SUPABASE_VIDEO_BUCKET`.

## Deployment steps

1. Back up Supabase and apply migrations through `003_content_preferences.sql` in staging.
2. Configure server environment variables without placing secrets in web/Android assets.
3. Deploy the Node backend at `https://app.footballvows.com` and verify `/api/health`, `/api/news`, `/api/blogs`, football fixtures and search endpoints.
4. Configure OAuth redirects and the Android deep link; test an existing user and administrator.
5. Run the GitHub Android APK workflow, install its artifact, clear application data, and complete onboarding.
6. On a physical Android device, verify live News, attributed Blogs, selected-date fixtures, provider searches, offline caches and Vows TV configuration before production approval.

## Current verification blocker

This execution environment receives an HTTP 403 response from its outbound proxy for both `https://app.footballvows.com/api/health` and the public WordPress endpoint. Therefore real articles and deployed live data could not be observed from this container or an actual Android device. Live content is **not declared complete** until the physical-device checks in step 6 pass.
