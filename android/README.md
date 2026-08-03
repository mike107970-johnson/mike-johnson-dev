# Android wrapper

The committed Capacitor configuration contains only the FootballVows production origin. It contains no football-provider credential. Generate the native project only after installing the pinned Capacitor toolchain, then run `npx cap add android`, `npx cap sync android`, and `./gradlew bundleRelease` from `android/`. Signing files, API keys and service credentials must remain in the CI secret store or local Gradle properties and must never be committed.
