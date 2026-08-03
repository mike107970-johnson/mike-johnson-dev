# Google Play launch checklist

- Replace the temporary FV icon with supplied official logo exports (512×512 and maskable) without cropping or recolouring.
- Host verified privacy policy, terms, support and account-deletion pages.
- Complete Data safety from actual Supabase, analytics, notification and payment behaviour.
- Configure Web App Manifest, Digital Asset Links and an HTTPS production origin.
- Package with a Trusted Web Activity or Capacitor; use `com.footballvows.app` only after confirming ownership.
- Provide phone/tablet screenshots, feature graphic, short description and content rating.
- Test deep links, offline shell, OAuth return, back navigation, notification permission and account deletion.
- Use Google Play Billing for digital Android subscriptions before enabling premium purchases in the packaged app.
- Run internal, closed and open testing tracks before production rollout.

The current repository is PWA-installable but does not include a signed Android bundle because signing identity and Play Console credentials must never be committed.
