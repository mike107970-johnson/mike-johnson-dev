# FootballVows authentication configuration

The application implements a server-side OAuth BFF: the browser starts at `/api/auth/google`, FootballVows creates PKCE verifier/state cookies, the identity service redirects to `/api/auth/callback`, and the server exchanges the one-time code. Access and refresh tokens are stored only in `HttpOnly`, `SameSite=Lax`, production `Secure` cookies. The intended internal route is validated and restored after login. The client never receives a Google client secret or service-role key.

## Google Cloud OAuth branding (manual)

Google—not application HTML—renders the OAuth consent heading. To make it display **“Continue to FootballVows”**, configure and publish/verify the Google Auth Platform brand:

- Application name: **FootballVows**
- Application logo: the approved FootballVows logo
- Homepage: `https://footballvows.com`
- Privacy Policy: `https://footballvows.com/privacy-policy/` (confirm the final published URL)
- Terms: `https://footballvows.com/terms-and-conditions/` (confirm the final published URL)
- Authorised domain: `footballvows.com` after Search Console/domain verification
- User support email: `support@footballvows.com`
- Developer contact email: a monitored FootballVows administrator address

Create a Web OAuth client. Its Google **Authorised redirect URI** is the callback displayed by the Authentication provider settings, normally:

`https://<FOOTBALLVOWS_PROJECT_REF>.supabase.co/auth/v1/callback`

Do not enter the FootballVows `/api/auth/callback` URL as the Google callback; Google returns to the authentication provider first. Complete Google verification if requested. Until the OAuth brand is configured and verified, Google may show a project hostname instead of FootballVows. The login page does not imitate or override Google consent wording.

## Authentication dashboard configuration (manual)

Configure the hosted authentication project as follows:

- Site name: **FootballVows**
- Site URL: the value of server secret `PUBLIC_APP_URL` (`https://app.footballvows.com` in production)
- Approved web redirect: `https://app.footballvows.com/api/auth/callback`
- Approved preview redirects: only exact trusted FootballVows preview origins
- Approved Android redirect: `com.footballvows.app://auth/callback`
- Google provider: enabled with its Web client ID and client secret stored only in the provider dashboard
- Email confirmation and secure password recovery: enabled
- JWT/session lifetime and refresh-token rotation: enabled according to FootballVows security policy

Paste the branded files from `supabase/auth-email-templates/` into the corresponding hosted email-template editors. Set the sender name to **FootballVows** and use a verified FootballVows sending domain. The server derives its callback from `PUBLIC_APP_URL`; never hardcode a preview callback into production.

## Android OAuth and deep links

The package/application ID is `com.footballvows.app`; the callback scheme is `com.footballvows.app://auth/callback`. Keep both values identical in the authentication allow-list, Capacitor configuration, Android intent filter and application code. When the native Android project is generated, add an intent filter for scheme `com.footballvows.app`, host `auth`, and path `/callback`.

Register Android OAuth clients when required using package `com.footballvows.app` and the SHA-1/SHA-256 fingerprints for each signing certificate:

```bash
keytool -list -v -alias <alias> -keystore <keystore>
./gradlew signingReport
```

Register separate debug, Play App Signing, and upload-certificate fingerprints as applicable. Never commit keystores or certificate private keys. The current web BFF callback is production-ready; the native deep-link callback must be verified after generating the Android project and installing the Capacitor App/Browser integration.

## Environment variables

Required protected server variables are `PUBLIC_APP_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`. Account deletion also requires `SUPABASE_SERVICE_ROLE_KEY` on the server. `SUPABASE_SITE_NAME=FootballVows` and `AUTH_ANDROID_DEEP_LINK=com.footballvows.app://auth/callback` document the externally configured values. Google client secrets belong in the hosted authentication provider configuration—not this repository or browser environment.

## Flow and error verification

1. Start at a protected destination, choose sign in, and verify successful Google login returns to that destination.
2. Confirm the provider screen says “Continue to FootballVows”; if not, fix Google Cloud branding rather than adding HTML.
3. Cancel Google login and verify the FootballVows login page shows a cancellation message.
4. Modify/remove OAuth state and confirm the callback is rejected.
5. Expire an access token and verify the server rotates it using the refresh cookie; remove both cookies and verify the profile returns to sign in.
6. Disable networking and verify a clear retryable error appears.
7. Sign out and confirm both server session and cookies are cleared.
8. Test account deletion with a staging user and confirm the session is removed.
9. On Android, verify callback deep linking and hardware Back navigation from provider, login and profile screens.

External Google Cloud branding, domain verification, callback allow-lists, hosted email templates, SMTP sender verification, Android intent filters, and signing fingerprints cannot be applied from this repository and must be completed manually by an authorised FootballVows administrator.
