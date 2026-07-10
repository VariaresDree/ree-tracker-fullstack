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
| **1 — Offline gap-fill** | Offline DoD checklist complete; per-resource Workbox strategies explicit; Dexie migration path documented | **In progress** (backoff, Workbox strategies, pack checksum/delta, offline flag + discrepancy logging, Dexie doc done; shared-IRT-module deferred to Phase 3) |
| **2 — UX / accessibility** | Lighthouse CI budgets pass; axe zero critical/serious; design tokens + shared primitives in place | **In progress** (component-axe tests, ProgressIndicator, token cleanup, Lighthouse CI + login axe done; authed-screen a11y/perf is a documented manual step — hard auth gate) |
| **3 — Content / assessment** | Syllabus weighting verified vs PRC + applied; recalibration run once on real data; mastery heatmap on a real taxonomy; AI review loop processed one batch | **In progress** — decomposed. **3.1 theta-engine unification DONE**; **3.2 syllabus_weights DONE** (PRC Math 25/ESAS 30/EE 45 in a config table; Board Sim FE+BE read one source); **3.3 taxonomy relation DONE** (`Topic` model seeded from PRC TOS + legacy-label aliases; `Question.topicId` FK + subtopic canonicalization; analytics/readiness/heatmap re-aggregate through the Question→Topic join; `migrate:taxonomy` backfill; `GET/PUT /tos` Topic-backed); **3.4 empirical recalibration DONE** (Bayesian-anchored JMLE pipeline in `calibrationService.runRecalibration`, shared by the nightly cron + `POST /api/admin/calibrate`; raw fits in `Question.empirical*`, author-blended served params in `irtA/irtB` with w=n/(n+30); `UserAbility` populated batch + live, CAT uses the per-subject prior). Next: 3.5 BKT+heatmap, 3.6 AI review loop (confidence-scale decision) |
| **4 — Competitive / scale** | Battle scoring server-authoritative under latency; leaderboard aggregated (not live-queried); offline exclusion verified in aggregation | Pending |

## Gap analysis summary (what already exists vs. what's missing)

Established 2026-07-08 by reading the actual code. "Adapt/extend," not "build from scratch," for anything marked PARTIAL.

### Phase 0 — Foundation
- CI runs vitest (FE+BE) + build (`.github/workflows/test.yml`). **Missing:** standing SQL-interpolation + route-auth checks; hand-computed IRT reference tests.
- Prior audit fixes (PR #40) confirmed intact in `main`: `@@index([isFlagged, subtopic])`, idempotency in-flight `reserve()`, Board-Sim `persistDraft`.
- **Correctness bug found:** AI-generated questions are marked `status:'quarantined'` client-side but the server drops the field, so they land live and immediately drawable. Fixed in Phase 0 (map to `isFlagged:true`).

### Phase 1 — Offline (ADAPT) — mostly DONE
- **Exists:** outbox (`syncQueue`/`pendingWrites`/`deadLetters`), UUID + content-hash idempotency deduped server-side, connectivity indicator (`OfflineStatusBadge`), `navigator.storage.persist()`, offline client grading with a locally-available answer key, app-kill-durable exam timer (`ree_sim_cache`).
- **Filled this phase:** exponential backoff (2s→60s cap in the outbox retry/interval); per-resource Workbox `runtimeCaching` (API=NetworkFirst, images/fonts=CacheFirst); content-pack checksum + delta via a cheap `/api/questions/pack-manifest` (re-download only changed subjects); offline-attempt flag (`QuestionAttempt.offline`) + client/server grading-discrepancy logging; Dexie migration path documented ([docs/offline/dexie-migration-path.md](./docs/offline/dexie-migration-path.md)).
- **Clarified:** "leaderboard exclusion" is already **structural** — offline attempts live only in the client outbox until they sync, so they have zero leaderboard effect until synced + server-re-graded. The offline flag adds audit + discrepancy visibility.
- **Deferred to Phase 3:** the shared client+server IRT module — building it around the currently-divergent estimators would be throwaway work; it lands with the theta-engine unification.

### Phase 2 — UX / accessibility
- **Exists:** design tokens (Tailwind v4 `@theme` + CSS vars in `styles/index.css`), shared UI primitives barrel (`components/ui`), distraction-free `ExamLayout` (wraps `/simulator` + Gauntlet), `prefers-reduced-motion`, modal focus trap.
- **Missing:** axe CI + Lighthouse CI budgets; `ProgressIndicator` primitive; ~29 stray hex + ~42 arbitrary `-[Npx]` values to tokenize.

### Phase 3 — Content / assessment
- **Exists:** 3PL IRT engine (single estimator since 3.1), calibration (grid-search) via cron + admin endpoint, confidence capture (3-tier LOW/MED/HIGH), heatmap now on the real `Topic` taxonomy (3.3), `UserTopicPerformance` (topic-FK + rebuilt by the migration), `SyllabusWeight` config (3.2).
- **Done 3.3 (taxonomy relation):** `Topic` table = single source (PRC TOS seed + curriculum-label `aliases`); `Question.topicId` FK with a one-time `subtopic` canonicalization (`scripts/migrateTaxonomy.js`, `npm run migrate:taxonomy[:dry]`); `src/services/topicResolver.js` (cached resolver + `PUT /tos` sync-diff); analytics/readiness/deep/heatmap all re-aggregate through `QuestionAttempt→Question→Topic` (`COALESCE(topic.name, subtopic)`), so re-tagging retroactively corrects history; `pack-manifest` checksum folds in `subtopic` so canonicalization delta-refreshes offline packs; unmatched legacy labels auto-create as `curated:false` topics (100% coverage). FE fallback TOS + formula-tag aliases mirror the seed.
- **Done 3.4 (empirical recalibration):** `engine/irt.js` gains `fitItem2pl` (bounded 2PL MLE, c fixed 0.20) + `jmleCalibrate` (Bayesian-anchored JMLE — person step uses live `(thetaRating, standardError)` priors so the item scale stays anchored to the served theta scale; no mean-centering, safe at any user count). One pipeline (`services/calibrationService.runRecalibration`) behind both `scripts/calibrate.js` (same cron path/flags) and `POST /api/admin/calibrate`; response matrix = first attempt per (user, question); raw fits in `Question.empiricalA/empiricalB/empiricalN`, served `irtA/irtB` = author blend w=n/(n+30) (author `difficulty` is b-scale by convention); `UserAbility` upserted per subject by the pipeline AND incrementally in the telemetry theta transaction; CAT `/next-item` uses the per-subject prior for subject-scoped sessions. Forecast automatically stops using its hit-rate fallback once rows exist.
- **Missing:** BKT + heatmap mastery coloring (3.5); `questions_pending_review` + `question_versions` + review UI, confidence 1–4 decision (3.6).

### Phase 4 — Competitive / scale
- **Exists:** server-authoritative battle scoring (Socket.io) + HTTP/socket rate limiting, `Battle`/`BattleOutcome` models.
- **Missing:** materialized/aggregated leaderboard view (live query today); `feature_flags` table; Capacitor wrapper + FCM push.

### Cross-cutting
- **Exists:** structured winston logging. **Missing:** Sentry/error-tracking; dedicated staging target.
