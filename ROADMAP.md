# REE Tracker — phased enhancement roadmap

Orchestration source: [`REE_TRACKER_ORCHESTRATED_ROADMAP_PROMPT.md`](./REE_TRACKER_ORCHESTRATED_ROADMAP_PROMPT.md) ·
Audit lens (re-run at each gate): [`REE_TRACKER_FULL_AUDIT_PROMPT.md`](./REE_TRACKER_FULL_AUDIT_PROMPT.md) ·
Offline spec: [`OFFLINE_MODE_IMPLEMENTATION_PROMPT.md`](./OFFLINE_MODE_IMPLEMENTATION_PROMPT.md)

**Rule:** phases are executed in order and each ends with a gate. Do not begin a phase until the previous gate is passed (the orchestration prompt's core principle). Only adjacent phases may overlap under time pressure — never skip one.

## Decisions locked (2026-07-08)

1. **Offline: adapt, don't migrate to Dexie.** The app already runs a working offline stack on idb-keyval + Zustand persist (outbox `syncQueue`/`pendingWrites`, idempotency, connectivity indicator, `navigator.storage.persist()`, offline grading, app-kill-durable timer), hardened in PR #40. A three-agent gap analysis found it ~70% spec-complete. We fill the real gaps on the existing stack rather than doing a from-scratch Dexie rewrite (which would risk regressing PR #40's durability fixes). The Dexie v1→v2 migration *pattern* is still documented (Phase 1) as future-proofing.
2. **Battles stay on Socket.io** (already server-authoritative + rate-limited), not Supabase Realtime, unless a concrete need justifies migrating — a deliberate deviation from the orchestration prompt's Phase 4 suggestion.

The theta-engine unification design ([`docs/superpowers/specs/2026-07-08-theta-engine-unification-design.md`](./docs/superpowers/specs/2026-07-08-theta-engine-unification-design.md)) lands in **Phase 3**.

## Phase status

| Phase | Gate condition | Status |
|---|---|---|
| **0 — Foundation** | Standing CI checks (SQL interpolation, route-auth coverage) pass and fail on violation; IRT engine unit-tested against hand-computed reference values; AI questions no longer land live un-reviewed | **In progress** |
| **1 — Offline gap-fill** | Offline DoD checklist complete; per-resource Workbox strategies explicit; Dexie migration path documented | Pending |
| **2 — UX / accessibility** | Lighthouse CI budgets pass; axe zero critical/serious; design tokens + shared primitives in place | Pending |
| **3 — Content / assessment** | Syllabus weighting verified vs PRC + applied; recalibration run once on real data; mastery heatmap on a real taxonomy; AI review loop processed one batch | Pending |
| **4 — Competitive / scale** | Battle scoring server-authoritative under latency; leaderboard aggregated (not live-queried); offline exclusion verified in aggregation | Pending |

## Gap analysis summary (what already exists vs. what's missing)

Established 2026-07-08 by reading the actual code. "Adapt/extend," not "build from scratch," for anything marked PARTIAL.

### Phase 0 — Foundation
- CI runs vitest (FE+BE) + build (`.github/workflows/test.yml`). **Missing:** standing SQL-interpolation + route-auth checks; hand-computed IRT reference tests.
- Prior audit fixes (PR #40) confirmed intact in `main`: `@@index([isFlagged, subtopic])`, idempotency in-flight `reserve()`, Board-Sim `persistDraft`.
- **Correctness bug found:** AI-generated questions are marked `status:'quarantined'` client-side but the server drops the field, so they land live and immediately drawable. Fixed in Phase 0 (map to `isFlagged:true`).

### Phase 1 — Offline (ADAPT)
- **Exists:** outbox (`syncQueue`/`pendingWrites`/`deadLetters`), UUID + content-hash idempotency deduped server-side, connectivity indicator (`OfflineStatusBadge`), `navigator.storage.persist()`, offline client grading with a locally-available answer key, app-kill-durable exam timer (`ree_sim_cache`).
- **Missing:** exponential backoff (fixed 15s/1.5s/30s cadences today); offline-attempt flag + leaderboard exclusion (offline batches sync through the same path and immediately move `thetaRating`, which drives the leaderboard); content-pack checksum + delta (monolithic blob, hardcoded `version:1`, full-overwrite refresh, idb-keyval not Cache Storage); explicit per-resource Workbox strategies; a shared client+server IRT module (three divergent estimators today).

### Phase 2 — UX / accessibility
- **Exists:** design tokens (Tailwind v4 `@theme` + CSS vars in `styles/index.css`), shared UI primitives barrel (`components/ui`), distraction-free `ExamLayout` (wraps `/simulator` + Gauntlet), `prefers-reduced-motion`, modal focus trap.
- **Missing:** axe CI + Lighthouse CI budgets; `ProgressIndicator` primitive; ~29 stray hex + ~42 arbitrary `-[Npx]` values to tokenize.

### Phase 3 — Content / assessment
- **Exists:** 3PL IRT engine + Rasch updater, calibration (grid-search) via cron + admin endpoint, confidence capture (3-tier LOW/MED/HIGH), heatmap (subtopic-string driven), `UserTopicPerformance`.
- **Missing:** `syllabus_weights` table (25/30/45 is hardcoded in two places); `empirical_*` calibration fields + author blend by N + JMLE; question→topic taxonomy relation; BKT; `questions_pending_review` + `question_versions` + review UI; confidence 1–4 decision. Theta-engine unification lands here.

### Phase 4 — Competitive / scale
- **Exists:** server-authoritative battle scoring (Socket.io) + HTTP/socket rate limiting, `Battle`/`BattleOutcome` models.
- **Missing:** materialized/aggregated leaderboard view (live query today); `feature_flags` table; Capacitor wrapper + FCM push.

### Cross-cutting
- **Exists:** structured winston logging. **Missing:** Sentry/error-tracking; dedicated staging target.
