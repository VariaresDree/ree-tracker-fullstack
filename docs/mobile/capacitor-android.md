# REE Tracker — Android app (Capacitor) + FCM push

The native Android app is a Capacitor shell around the **same production PWA
build** (`ree-tracker/dist`). Everything code-side is already in the repo
(Phase 4.2): the `android/` project, the push plugin, token registration, the
backend send pipeline, and the `push-notifications` feature flag that keeps it
all dark until you flip it.

This doc lists the parts **only you** can do — they need your Firebase console,
your machine, and (later) your store accounts.

## One-time setup

### 1. Add the Android app to your existing Firebase project
1. [Firebase console](https://console.firebase.google.com) → your existing
   project (the one Auth already uses) → ⚙ *Project settings* → *Your apps* →
   **Add app → Android**.
2. Package name: **`com.reetracker.app`** (must match `capacitor.config.json`).
3. Download **`google-services.json`** and place it at
   `ree-tracker/android/app/google-services.json`.
   It is **gitignored** on purpose (public repo) — keep a private copy.
   The Gradle build applies the google-services plugin automatically once the
   file exists; without it the app still builds, but push won't work.

### 2. Install the Android toolchain
- [Android Studio](https://developer.android.com/studio) (bundles the SDK).
- A physical device with USB debugging, or an emulator **with Google Play
  services** (FCM needs Play services).

### 3. Point the app at the production backend
The web bundle bakes the API base at build time. Create
`ree-tracker/.env.production.local` (gitignored by Vite) containing:

```
VITE_BACKEND_URL=https://<your-render-backend>.onrender.com
```

(The same Firebase *web* config env vars the PWA build uses must also be
present, exactly as in your Vercel build settings.)

## Build & run

```bash
cd ree-tracker
npm run cap:sync   # vite build + copy dist into android/ + sync plugins
npm run cap:open   # opens the project in Android Studio
```

In Android Studio: pick your device → **Run**. Sign in with your normal
email/password account (Firebase Auth works unchanged inside the webview).

## Go live with push

1. Deploy the backend (it already has the send pipeline) and run
   `npx prisma db push` once (adds the `DeviceToken` table).
2. Flip the rollout flag (admin token required):
   `PUT /api/config/flags/push-notifications` with body `{ "enabled": true }`.
3. Launch the app, sign in, accept the notification permission — the device
   token registers automatically.
4. Verify end-to-end: `POST /api/admin/push-test` (empty body → sends to you).
   A notification should land on the device.
5. Optional daily streak reminder: schedule `npm run push:streaks` as an
   external cron (e.g. 19:00 Asia/Manila — same pattern as the calibrate
   cron). Dry-run first: `npm run push:streaks:dry`. With the flag off, runs
   are safe no-ops.

## Later (out of scope for now)

- **Release signing / Play Store:** generate an upload keystore in Android
  Studio (*Build → Generate Signed App Bundle*), keep it private, and follow
  the Play Console onboarding. Nothing in the repo blocks this.
- **iOS:** needs macOS + an Apple Developer account. `npx cap add ios` on a
  Mac, plus an APNs key uploaded to Firebase Cloud Messaging.
- **Updating the app:** the native shell bundles its own copy of the web
  assets — web users keep getting updates via the normal Vercel deploy, but
  the Android app only picks them up when you re-run `npm run cap:sync` and
  rebuild/redistribute. Plugin or config changes always require a rebuild.
