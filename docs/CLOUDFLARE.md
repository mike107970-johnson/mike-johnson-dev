# Cloudflare Worker quick reference

Use `docs/CLOUDFLARE_WORKERS.md` for the complete beginner-friendly deployment guide.

The Android football backend must be the deployed Cloudflare Worker (`https://...workers.dev`), configured through the public build variable `PUBLIC_API_ORIGIN`. The API-Football credential is only the Cloudflare Worker secret named `API_FOOTBALL_KEY`; never place its value in source code, GitHub Actions, Android assets, or the APK.
