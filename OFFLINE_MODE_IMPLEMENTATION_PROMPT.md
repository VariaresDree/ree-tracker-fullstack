# Implementation prompt: Offline-first mode for REE Tracker

Paste this whole document into Claude Code (or hand it to a developer) as the task brief. It is sequenced so each phase can be executed and verified before the next begins.

---

## 1. Context

REE Tracker (`VariaresDree/ree-tracker-fullstack`) is a full-stack PWA for Philippine REE board exam review. Current stack: Vite frontend, Node/Express backend, Prisma ORM on Supabase Postgres, Zustand for client state, Gemini API for AI-generated content. Recent audits fixed: an auto-admin privilege escalation bug, SQL injection via raw string interpolation, answers being sent to the browser before grading (now server-side re-verified through `/telemetry-bulk` in `analyticsRoutes.js`), an exposed Gemini key, a broken IRT difficulty argument mismatch, and various Zustand/React bugs.

The app currently requires a live connection for everything: answering questions, active recall sessions, board simulator mock exams, and IRT-driven adaptive selection.

## 2. Objective

Add an offline mode so a user with no connection can:

1. Answer previously-downloaded questions and get feedback.
2. Run a full **Active Recall** review session offline.
3. Run a full **timed board simulator mock exam** offline.
4. Have all offline activity sync back to Postgres automatically and losslessly once reconnected, without duplicating submissions or corrupting server-side stats.

Do **not** attempt to make real-time competitive Battles work offline — those stay online-only and should degrade gracefully with a clear "reconnect to battle" state.

## 3. Locked-in architecture decisions

Do not re-litigate these; implement against them:

- **Local database:** `Dexie.js` over IndexedDB. Not localForage, not raw IndexedDB, not PGlite for v1 (PGlite/ElectricSQL sync can be a v2 exploration once the outbox pattern is proven).
- **App shell / asset caching:** `vite-plugin-pwa` (Workbox under the hood).
- **Content delivery:** versioned, subject-scoped "offline packs" (JSON) fetched on explicit user opt-in, stored via the Cache Storage API, tracked with a version + checksum in Dexie.
- **Sync mechanism:** manual outbox queue flushed on `online` events and periodic checks — **not** the Background Sync API (unsupported in Safari/iOS, and a meaningful share of users will be on iPhones).
- **Idempotency:** every offline-generated record gets a client-side UUID at creation time. The server must dedupe on that UUID.
- **Offline mock exams are graded client-side but excluded from leaderboards/topnotcher rankings until server re-verification succeeds.** This is a deliberate, documented exception to the "never trust client-side grading" rule from the last security audit — see Section 8.

## 4. Phase 1 — PWA shell and installability

- Install and configure `vite-plugin-pwa`.
- Precache the app shell (JS/CSS/fonts/icons). Fix the previously-flagged missing PWA icon assets as part of this phase.
- Add `navigator.storage.persist()` request on first load to reduce risk of Safari/iOS evicting IndexedDB data after inactivity.
- Add a visible connectivity indicator in the UI shell (online / offline / syncing).

**Definition of done:** app installs as a PWA on Android and iOS, shell loads with no network connection, connectivity indicator reflects real state.

## 5. Phase 2 — Local database layer (Dexie)

Create a `db/offlineDb.js` module defining Dexie tables:

- `attempts` — `{ uuid, questionId, selectedAnswer, isCorrect, timestamp, sessionId, synced }`
- `sessions` — `{ uuid, type: 'active_recall' | 'mock_exam', subjectIds, startedAt, completedAt, synced }`
- `srsState` — mirrors whatever fields the existing SRS scheduler needs client-side
- `irtState` — local ability estimates per subject, `{ subjectId, theta, lastUpdated, synced }`
- `outboxQueue` — pending sync operations, `{ uuid, type, payload, createdAt, retryCount }`
- `contentPacks` — `{ subjectId, version, checksum, downloadedAt }`

**Definition of done:** all four tables support create/read/update through a typed data-access module; no direct Dexie calls scattered through components.

## 6. Phase 3 — Downloadable content packs

- New endpoint: `GET /api/content-packs/:subjectId` returning a versioned JSON bundle of questions, choices, explanations, image URLs, and IRT difficulty parameters for that subject.
- Client: a "Download for offline" control per subject, showing pack size before download.
- Store pack JSON via Cache Storage API; store `{version, checksum}` metadata in the `contentPacks` Dexie table.
- Support delta re-download: if the server pack version changes, re-fetch only that subject, not the whole library.
- Explanations and images should be optional sub-downloads if they meaningfully increase pack size (be mindful of Philippine mobile data costs — do not auto-download).

**Definition of done:** a subject can be downloaded, the app can be put in airplane mode, and every question in that subject renders correctly including images.

## 7. Phase 4 — Sync engine (outbox pattern)

- All writes from offline sessions go to Dexie first, then get queued in `outboxQueue`.
- A sync worker (triggered on `window.addEventListener('online', ...)` plus a periodic interval, e.g. every 30s while online) flushes the queue against the existing `/telemetry-bulk` route in `analyticsRoutes.js` — reuse this route, do not create a parallel submission path.
- Server-side: `/telemetry-bulk` must accept and store the client UUID, and reject/ignore duplicate UUIDs instead of double-counting (check this against the Prisma schema — add a unique constraint on the attempt/session UUID column if one doesn't exist).
- Exponential backoff on failed flush attempts; surface a non-blocking "N items pending sync" indicator to the user rather than failing silently.
- On successful sync, mark the local record `synced: true` rather than deleting it, until a cleanup pass confirms server acknowledgment.

**Definition of done:** complete an offline session, go back online, confirm the session appears server-side exactly once with no duplicate telemetry rows, even if connectivity flaps mid-sync.

## 8. Phase 5 — Offline Active Recall session

- Active Recall's existing instant-feedback UX (confirmed in the last audit to be intentional, not a bug) must work identically offline: grade locally against the downloaded pack's answer key, show feedback immediately.
- On sync, the server re-verifies the grading server-side and reconciles the stored result — same pattern as the online path, just deferred.
- SRS scheduling updates happen locally in `srsState` during the session and sync via the outbox.

**Definition of done:** a full Active Recall session runs start-to-finish with zero network requests, feedback timing matches the online experience.

## 9. Phase 6 — Offline board simulator mock exam

This is the sensitive one. Implement with these explicit rules:

- Offline mock exam question sets must be pre-selected and bundled into the downloaded pack *before* going offline — do not attempt dynamic selection offline.
- The answer key ships with the pack for offline grading. Store it in a separate Dexie table from the visible question data and do not expose it through any component prop or dev-tools-visible state until after the user submits that question — mirror the spirit of the original "don't leak the answer before grading" fix, just relaxed for the offline case out of necessity.
- **Any exam attempt started offline must be flagged `offline: true` and excluded from leaderboards, rankings, and topnotcher-style aggregates until the server has independently re-verified the score.**
- On sync, re-grade the submitted answers server-side against the authoritative answer key. If the server score disagrees with the client score, log the discrepancy (this is your signal that the offline answer key or client scoring logic has drifted) and store the server score as canonical.
- Timer state must persist locally (survive app kill / phone lock) so a user can't get an unlimited timer by force-closing the app offline.

**Definition of done:** a full timed mock exam runs offline, submits correctly on reconnect, does not appear on any leaderboard until server re-verification completes, and a deliberately mismatched local/server score is logged rather than silently trusted.

## 10. Phase 7 — Offline adaptive engine (IRT)

- Port the corrected server-side IRT selection/scoring logic (the one fixed for the difficulty-argument mismatch) to a shared JS module usable both server-side (Node) and client-side (browser), rather than maintaining two implementations.
- Ship each content pack with the current IRT difficulty parameters for its questions.
- Client-side theta (ability estimate) updates locally during offline sessions and syncs via the outbox; server reconciles using its own copy on next contact (last-write-wins by timestamp is acceptable — IRT estimates converge over time regardless).

**Definition of done:** offline adaptive question selection produces materially the same next-question choice as the online engine would, given the same local ability estimate.

## 11. Explicit non-goals

- Real-time competitive Battles offline — show a disabled state instead.
- Full-text search across explanations offline (defer to a later SQLite/PGlite pass if needed).
- Offline material upload or account deletion — these remain online-only actions.

## 12. Cross-cutting acceptance checklist

- [ ] App installs and loads with zero connectivity.
- [ ] At least one subject's content pack downloads, versions, and re-downloads deltas correctly.
- [ ] Active Recall session completes fully offline with correct instant feedback.
- [ ] Board simulator mock exam completes fully offline, timer persists across app kill.
- [ ] Offline mock exam attempts are excluded from leaderboards until server re-verification.
- [ ] Sync queue flushes automatically on reconnect with no duplicate telemetry rows (test by toggling airplane mode mid-sync).
- [ ] iOS Safari: confirm behavior without Background Sync API; confirm `navigator.storage.persist()` reduces IndexedDB eviction risk.
- [ ] Discrepancies between local and server-side mock exam scoring are logged, not silently overwritten without a trace.
