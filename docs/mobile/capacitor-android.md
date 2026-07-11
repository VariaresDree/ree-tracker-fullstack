# REE Tracker — Android app (Capacitor) + FCM push: beginner walkthrough

The native Android app is a Capacitor shell around the **same production PWA
build** (`ree-tracker/dist`). Everything code-side is already in the repo
(Phase 4.2): the `android/` project, the push plugin, token registration, the
backend send pipeline, and the `push-notifications` feature flag that keeps it
all dark until you flip it.

This is a start-to-finish walkthrough of the parts **only you** can do — they
need your Firebase console, your machine, and (later) your store accounts.
Nothing here requires prior Android experience.

> **Estimated time:** ~30 min of clicks + ~30–60 min of downloads/Gradle sync
> on the first build. Later builds take a couple of minutes.

---

## Part A — Firebase console (one-time, ~5 minutes)

You already did the key step: `google-services.json` exists. Two follow-ups:

### A1. ✅ You added the Android app & downloaded google-services.json
For the record, the click path was: [Firebase console](https://console.firebase.google.com)
→ your project → ⚙ **Project settings** → **Your apps** → **Add app** →
Android icon → package name **`com.reetracker.app`** (must match
`capacitor.config.json` exactly — a typo here means push tokens never arrive)
→ **Register app** → **Download google-services.json**.

The file belongs at:

```
ree-tracker/android/app/google-services.json
```

### A2. ⚠️ Restrict the Android API key (do this now)
You committed `google-services.json` to the **public** repo (commit `ec1d463`).
That file's `current_key` is designed to be shippable inside APKs, but since
it's now in public git history, lock it to your app:

1. [Google Cloud console](https://console.cloud.google.com/apis/credentials)
   → select the same project → **Credentials**.
2. Find the key named like **"Android key (auto created by Firebase)"** →
   pencil icon.
3. Under **Application restrictions** choose **Android apps** → **Add** →
   package name `com.reetracker.app` + your **SHA-1** fingerprint.
   Get the SHA-1 by running, in `ree-tracker/android`:
   ```bash
   ./gradlew signingReport        # gradlew.bat signingReport on Windows cmd
   ```
   Copy the `SHA1:` line of the `debug` variant (add the release one later too).
4. Save. (If you'd rather keep the file out of the repo going forward:
   `git rm --cached ree-tracker/android/app/google-services.json`, commit, and
   keep a private copy — the `.gitignore` entry already covers it.)

Also add the same **SHA-1** in Firebase console → Project settings → Your apps
→ your Android app → **Add fingerprint** (needed by some Google services;
harmless and future-proof).

---

## Part B — Your machine (one-time)

### B1. Install Android Studio
Download from <https://developer.android.com/studio> (~1.1 GB installer).
Run it → first-run wizard → **Standard** setup. It installs the Android SDK,
platform tools, and an emulator image (several more GB). The right Java (JDK)
is **bundled** — do not install Java separately.

### B2. Prepare a device
**Physical phone (recommended — push behaves like production):**
1. Settings → **About phone** → tap **Build number** 7 times ("You are now a
   developer!").
2. Settings → **System → Developer options** → enable **USB debugging**.
3. Plug into the PC; accept the "Allow USB debugging?" prompt on the phone.

**Or an emulator:** Android Studio → Device Manager → Create device → pick any
Pixel → choose a system image **with the Play Store icon** (FCM requires
Google Play services; images without it never receive push).

### B3. Point the app at the production backend
The web bundle bakes the API URL at build time. Create
`ree-tracker/.env.production.local` (gitignored by Vite) containing your
production values — copy them from **Vercel → your project → Settings →
Environment Variables** (same values the PWA build uses):

```
VITE_BACKEND_URL=https://<your-render-backend>.onrender.com
VITE_FIREBASE_API_KEY=...        # the web config block, exactly as on Vercel
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
# ...and any other VITE_* vars your Vercel build defines
```

If a value is missing here, the native app builds fine but login or API calls
fail at runtime — this is the most common "works on web, blank on phone" cause.

---

## Part C — Build & run

```bash
cd ree-tracker
npm run cap:sync   # vite build + copy dist into android/ + sync plugins
npm run cap:open   # opens the project in Android Studio
```

First open: the **Gradle sync** bar at the bottom runs for several minutes and
downloads dependencies (GBs on a cold machine). Let it finish.

Then: pick your device in the toolbar dropdown → green **Run ▶**. The app
installs and launches. Sign in with your normal email/password account —
Firebase Auth works unchanged inside the webview.

> **Every time you change web code:** re-run `npm run cap:sync`, then Run
> again. The phone bundles its own copy of the web assets; Vercel deploys
> don't reach it.

---

## Part D — Go live with push

1. Backend is deployed and `npx prisma db push` has been run once (adds the
   `DeviceToken` table — the single push covers all accumulated schema).
2. Flip the rollout flag (admin account):
   ```bash
   curl -X PUT "https://<backend>/api/config/flags/push-notifications" \
     -H "Authorization: Bearer <YOUR_FIREBASE_ID_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"enabled": true}'
   ```
   (Get an ID token quickly: DevTools console on the logged-in web app →
   `await firebase.auth().currentUser.getIdToken()` — or from the app's
   network-tab request headers.)
3. Launch the Android app, sign in, and accept the notification permission
   prompt (Android 13+ asks explicitly). The device token registers itself.
4. Verify end-to-end:
   ```bash
   curl -X POST "https://<backend>/api/admin/push-test" \
     -H "Authorization: Bearer <YOUR_FIREBASE_ID_TOKEN>" \
     -H "Content-Type: application/json" -d '{}'
   ```
   A notification should land on the device within seconds.
5. Optional daily streak reminder: schedule `npm run push:streaks` as an
   external cron (e.g. 19:00 Asia/Manila, same pattern as the calibrate cron).
   Dry-run first with `npm run push:streaks:dry`. With the flag off, runs are
   safe no-ops.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Build error `File google-services.json is missing` | The file isn't at `android/app/google-services.json`. Put it there; re-sync Gradle. |
| App builds but push never registers | Emulator image without Play services; or notification permission denied (Android 13+ — reinstall or enable in App info); or the `push-notifications` flag is still off. |
| Login spins forever on the phone | `VITE_*` env vars missing from `.env.production.local` at build time, or the Render backend is cold-starting (free tier sleeps — first request can take ~50s; retry). |
| API calls fail with network errors | `VITE_BACKEND_URL` wrong or missing its `https://`. Rebuild after fixing (`npm run cap:sync`). |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | A previous build with a different signature is installed. Uninstall the app from the device, run again. |
| Push-test returns `{sent: 0}` | No DeviceToken row yet — open the app and sign in first; check the flag is enabled. |
| Gradle sync fails with SDK errors | Android Studio → Tools → SDK Manager → install the API level it names, re-sync. |

---

## Later (out of scope for now)

- **Release signing / Play Store:** Android Studio → *Build → Generate Signed
  App Bundle* → create an upload keystore (keep it private and BACKED UP — a
  lost keystore means a new app listing), then Play Console onboarding.
  Add the release keystore's SHA-1 to the API-key restriction from A2.
- **iOS:** needs macOS + an Apple Developer account. `npx cap add ios` on a
  Mac, plus an APNs key uploaded to Firebase Cloud Messaging.
