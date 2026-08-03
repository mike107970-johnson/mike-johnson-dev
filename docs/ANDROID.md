# FootballVows Android project

The `android/` directory is a complete text-based Capacitor Android source project, not a remote-browser placeholder. Production web assets from `public/` are packaged in `android/app/src/main/assets/public/`; native requests use the HTTPS FootballVows backend configured in `public/config.js`. Provider and service-role credentials remain server-only.

## Why the wrapper JAR is excluded

This branch-update interface rejects binary files. Consequently, `android/gradle/wrapper/gradle-wrapper.jar` is intentionally excluded and ignored. APKs, AABs, keystores, compiled classes, native libraries, archives, build directories, caches, raster launcher images and raster splash images are also excluded. The Gradle wrapper properties and both text wrapper launchers remain committed. Regenerate the missing JAR only with an installed official Gradle distribution; do not copy it from an unofficial source.

The launcher and splash artwork committed here are text-based Android VectorDrawable/adaptive-icon XML resources. They keep the project buildable without PNG/WebP assets. Replace them with final approved FootballVows artwork through Android Studio's Image Asset tool when official source artwork is available.

## Toolchain

- Node 20 or newer and installed npm dependencies
- Java 21 runtime (Android source compatibility remains Java 17)
- Android SDK Platform 35 and Build Tools 35.0.0
- Official Gradle 8.11.1 installation for wrapper regeneration
- Android Gradle Plugin 8.7.2
- Android Studio with an API 35 SDK

The shared SDK values are loaded from `android/variables.gradle` into `rootProject.ext` before any Android module is evaluated: compile SDK 35, target SDK 35, minimum SDK 26, and Build Tools 35.0.0. The app and generated Capacitor modules consume those root values rather than declaring contradictory versions.

## Restore the official Gradle wrapper

First install project dependencies with `npm install`. From the repository root, regenerate the binary using an official Gradle 8.11.1 installation.

### macOS and Linux

```bash
gradle -p android wrapper --gradle-version 8.11.1 --distribution-type bin
chmod +x android/gradlew
```

### Windows PowerShell or Command Prompt

```powershell
gradle.bat -p android wrapper --gradle-version 8.11.1 --distribution-type bin
```

If `gradle` is not on `PATH`, use the executable inside the official Gradle installation. The command restores `android/gradle/wrapper/gradle-wrapper.jar`; it remains intentionally untracked. Android Studio can import the committed `android/settings.gradle` project, but command-line `gradlew` builds require this regeneration first. Android Studio may also use its configured official local Gradle installation to run the wrapper task.

## Synchronize and build

```bash
npm install
npm test
npm run build:web
npm run cap:sync
npm run android:debug
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk` and must not be committed.

For a release bundle, configure the upload key in local `key.properties`, environment variables, CI secrets, or Android Studio—never in Git—then run:

```bash
npm run android:bundle
```

The signed AAB is generated below `android/app/build/outputs/bundle/release/` and must not be committed. Complete Play App Signing configuration in Play Console before release.

## Generate launcher icons in Android Studio

1. Open the `android/` project in Android Studio.
2. Right-click `app/src/main/res` and choose **New → Image Asset**.
3. Choose **Launcher Icons (Adaptive and Legacy)**.
4. Select the approved FootballVows source artwork, preserve its proportions and brand colours, and preview all masks.
5. Generate the density-specific resources locally. Raster outputs are intentionally excluded from this text-only branch; retain the committed vector XML resources unless the branch interface later supports approved binaries.

## Native configuration

The application ID and Java package are `com.footballvows.app`; minimum SDK 26 corresponds to Android 8.0. The manifest permits Internet/network-state access, blocks cleartext traffic, defines the authentication deep links and verified HTTPS application link, and launches `MainActivity` in single-task mode. The theme configures the navy status/navigation bars, Android splash-screen API, adaptive vector launcher icons, safe-area CSS and Capacitor Back/app-link listeners.

After any web or plugin change, run `npm run cap:sync` and commit only synchronized text sources and packaged text assets. Add production `assetlinks.json`, Android OAuth SHA-1/SHA-256 fingerprints and external signing configuration before release.

## Download a debug APK using your phone

The GitHub runner builds the APK with the official Gradle 8.11.1 installation supplied by `gradle/actions/setup-gradle`; it does not create or invoke a wrapper JAR. No build binary is committed to this repository. The workflow artifact is retained for 14 days.

The workflow first runs the installed official Gradle against the complete Android project with the `help` task, ensuring project configuration is valid. It then uses the same installed Gradle executable with `--project-dir android assembleDebug`, avoiding the intentionally omitted wrapper binary entirely.

1. On your phone, open the FootballVows repository on GitHub and sign in.
2. Tap the **Actions** tab. If it is hidden, open the repository navigation menu first.
3. Select **Build FootballVows Android APK** from the workflow list.
4. Tap **Run workflow**, keep the `main` branch selected, and confirm **Run workflow**.
5. Wait for the **Build debug APK** run to show a green check mark. Open the completed run.
6. Scroll to **Artifacts** and tap **FootballVows-debug-apk** to download the ZIP file.
7. Open the downloaded ZIP in Files by Google, My Files, or another trusted archive application and extract `FootballVows-debug.apk`.
8. Tap `FootballVows-debug.apk`. If Android blocks it, allow **Install unknown apps** for the browser or file manager you used, then retry.
9. Review the Android installation prompt and tap **Install**. Disable the unknown-app permission again afterwards if you do not need it.

The debug APK is intended for private testing and is not a Play Store release. Do not download artifacts from untrusted forks or unexpected workflow runs. A release AAB still requires external FootballVows signing and Play Console configuration.
