# REE Tracker — The Ideal Review App: Audit Findings + Roadmap

_Companion to `ROADMAP.md` (phased build history) and `REE_TRACKER_FULL_AUDIT_PROMPT.md` (audit
lens). This document covers (1) the correctness fixes shipped in this pass, (2) audit findings
surfaced so far across the five pillars, and (3) a prioritized feature roadmap toward an app that
doesn't just teach but **tests, assesses, and analyzes** a candidate's readiness end-to-end._

Scope note: the app is already mature — a 3PL IRT/CAT engine, BKT mastery, empirical recalibration,
a PRC-aligned `Topic` taxonomy, an AI review loop, a materialized leaderboard, and an offline stack
are all in place. This roadmap **builds on that base**; it does not rebuild it.

---

## 1. Critical bugs found — fixed this pass (with code)

All four were traced to root cause in the live code (frontend + `ree-tracker-backend`). Fixes are
implemented on branch `fixes/tally-vault-ai-generation`.

| # | Bug | Root cause | Fix |
|---|-----|------------|-----|
| A1 | "Questions answered" tally diverges across Dashboard, Consistency Matrix, and the calendar-day sum | Three accumulators (`totalAnswered`, `microTopics`, `ActivityLog`) reconciled by three different merge rules; Gauntlet did a *partial* optimistic update; the KPI used `max(totalAnswered, Σ microTopics)`; backend calendar capped at 365 days; the Consistency Matrix rendered no total | **Server-authoritative single source of truth.** Backend returns all days uncapped (`analyticsRoutes.js`); `mergeServerIntoStats` (`analyticsSync.js`) overlays only the local optimistic *excess* uniformly so `totalAnswered === Σ(activityCalendar)` always; Gauntlet full-replaces like Active Review/Board Sim (`useGauntletEngine.js`); the KPI reads `totalAnswered` (`Dashboard.jsx`); the Consistency Matrix renders the grand total and uses the dynamic daily target (`ActivityCalendar.jsx`). Invariant locked by a unit test. |
| A2 | Direct media upload in Cloud Vault does nothing | The Firebase Storage upload worked but the DB-persist POST was a discarded `// Phase 3` TODO; every vault mutation was a `"Database route pending construction."` stub — despite a fully-built backend | Wired `uploadAndCommitMaterial` to persist the Firebase downloadURL via the JSON `POST /upload` route + refresh; un-stubbed create/rename/delete/move to the real routes (`useFileManager.js`, `dbQueries.js`); added `PATCH /materials/:id` for rename/move; made `Material.folderId` nullable so root uploads don't hit an FK violation (`materialRoutes.js`, `schema.prisma`). |
| A3 | AI constant/formula generation produces duplicates | The prompt was built blind — the existing library (already loaded in `ReferenceAdmin`) was never passed, so dedup happened only at insert (wasting the batch) | `generateReferenceAI` now takes an `existing` exclusion list and injects it into the prompt (mirroring the question generator's anti-loop directive); `ReferenceAdmin` passes existing names/titles filtered by subject/category (`geminiApi.js`, `ReferenceAdmin.jsx`). |
| A4 | EE question generation always makes a "Quantities/Units/Constants" question | The ingestion Topic dropdown had no neutral placeholder, so its default was the real index-0 topic; plus a static-vs-dynamic taxonomy desync (phantom selection) | Added an "All topics" option, defaulted the topic to the neutral `'All'` sentinel, and sourced options + default from the same `dynamicTOS` (`LibraryIngestion.jsx`, `useAIIngestion.js`). An explicit topic pick is now honored verbatim. |

**Deploy:** A1 + A2 are coupled frontend+backend deploys; A2 needs `prisma db push` (the
`Material.folderId` nullable change) on the Render backend. A3 + A4 are frontend-only.

---

## 2. Audit findings so far (5 pillars)

A full rigorous sweep is its own workstream (**W0** below). The items here were surfaced while
tracing the four bugs and from reading adjacent code; severities use the existing taxonomy
(Critical / High / Medium / Low).

**1. Frontend functionality & state**
- _(fixed)_ Fragile three-rule stats merge (A1). — High
- _(fixed)_ Whole Cloud Vault CRUD stubbed (A2). — High
- AI ingestion sets `status: 'quarantined'` client-side; confirm the server maps it to the pending-review table and never lets it reach the live `Question` table (ROADMAP Phase 0 flagged this class). — verify, potential High.

**2. Backend API & business logic**
- _(fixed)_ Analytics `activityCalendar` capped at 365 days (A1). — Medium
- _(verified OK)_ All attempt-write paths (`/telemetry-bulk`, `/exams/grade`, battles) go through the shared `recordAttempts`, which writes `QuestionAttempt` + `ActivityLog` in lockstep — this is what makes the A1 invariant hold. — no action.
- Confirm every mutating route has `authMiddleware` + `requireAdmin` where appropriate (spot-check the newer routes). — verify.

**3. Security & authentication**
- `ree-tracker-backend/firebase-service-account.json` exists on disk — **confirm it is gitignored and has never been committed**; rotate if it was. — Critical if exposed.
- No in-repo `storage.rules` — Firebase Storage rules live only in the console; confirm they allow authenticated writes under `board_materials/{uid}/…` and nothing broader. — verify.
- Re-verify prior fixes haven't regressed: auto-admin escalation, SQL raw-interpolation, exposed Gemini key. — verify.
- Burst-submit protection: offline reconnect flushes the outbox in a burst — confirm `/telemetry-bulk` rate limiting + idempotency hold under it. — Medium.
- Run `npm audit` on both packages (an earlier install reported 7 vulns incl. 1 critical) and triage. — Medium.

**4. Edge cases & resilience**
- Offline sync idempotency under a flaky connection (toggle network mid-sync) — exercise it. — High to verify.
- Designed empty/error states for: no questions downloaded, no history yet, failed submission, lost connection mid-session. — Medium.
- _(fixed)_ Root-folder upload FK edge (A2). — Medium.

**5. Database & performance**
- Initial JS payload: the build warns on >500 KB chunks (`pdf-export`, `charts`, `latex`) — confirm these stay lazy/code-split off the dashboard critical path. — Medium.
- Question/explanation image sizing + lazy-loading on mobile data. — Medium.
- Re-render hygiene: the Board-Sim timer must not re-render the question list each tick (Zustand selector discipline). — verify.

---

## 3. Ideal-app roadmap (prioritized waves)

Each wave notes **value / effort / dependencies / coupled-deploy**. Themes from the brief are woven
across waves.

### W0 — Full 5-pillar audit sweep _(do next)_
Run the `security-review` and `code-review` skills over the branch + a pass with
`REE_TRACKER_FULL_AUDIT_PROMPT.md`, at 360/768/1440px with axe + Lighthouse on the four key screens.
Produces the ranked backlog that seeds the waves below.
_Value: high · Effort: M · Deps: none · Deploy: n/a._

### W1 — Assessment & readiness (test/assess focus)
- Surface a first-class **Board-Readiness Index** prominently (not buried), with a plain-language
  "what this means" and trend over time.
- **Per-subject pass-probability** vs the real PRC thresholds (general average ≥70, no grade <50),
  computed from the IRT ability + `SyllabusWeight` (Math 25 / ESAS 30 / EE 45).
- A **diagnostic/placement CAT** on first run that seeds `UserAbility` so the adaptive engine starts
  calibrated instead of cold.
_Value: high · Effort: M–L · Deps: existing IRT/CAT, `UserAbility`, forecast · Deploy: coupled._

### W2 — Personalized practice loop (analyze → act)
- **Spaced-repetition scheduler** layered on BKT `pMastery` (due-today queue, lapse handling).
- An **adaptive daily study plan** that allocates reps by weakest-topic mastery × syllabus weight ×
  days-to-exam.
- **Auto-generated weak-topic drills** — one tap turns the lowest-mastery topics into a targeted set.
_Value: high · Effort: L · Deps: BKT mastery, taxonomy, A4 topic fidelity · Deploy: coupled._

### W3 — Mock-exam realism (test focus)
- **Full-length PRC-weighted timed mock boards** (correct item counts per subject, real time limits).
- **Pass/fail scoring** against actual thresholds, per-subject + overall, with a clear-eyed verdict.
- **Attempt-history trends** — mock scores over the review journey, so improvement is visible.
_Value: high · Effort: M · Deps: Board Sim, `SyllabusWeight`, `examStandards` · Deploy: coupled._

### W4 — Content quality & coverage
- Extend the A3 dedup approach to **question generation** (exclude near-duplicates already in bank).
- **Taxonomy coverage-gap detector** — which topics are thin on question count / stale, to direct
  generation and review.
- **Review throughput** — batch approve/reject, keyboard-driven queue, so the AI loop scales.
_Value: med–high · Effort: M · Deps: AI review loop, taxonomy · Deploy: coupled._

### W5 — Reliability & observability
- **Sentry** (or equivalent) for client + server error tracking — the ROADMAP's open cross-cutting
  gap; failures currently disappear in production.
- A dedicated **staging** target so coupled deploys are rehearsed before prod.
_Value: high · Effort: S–M · Deps: none · Deploy: additive._

### W6 — Accessibility & performance on authed screens
- The documented manual gate: axe (zero critical/serious) + Lighthouse budgets on Dashboard, Active
  Recall, Board Simulator, and Analytics — the pieces behind the login that CI can't reach.
- Verify heavy chunks stay code-split; optimize question images for mobile data.
_Value: med · Effort: M · Deps: W0 findings · Deploy: frontend._

### W7 — Onboarding & UX clarity
- Make it obvious what **Active Recall vs Gauntlet vs Arena vs Board Simulator** each do (a first-run
  tour + mode descriptions), tied to the W1 diagnostic.
- Designed empty/error states everywhere a blank screen or console error can currently appear.
_Value: med · Effort: S–M · Deps: none · Deploy: frontend._

### W8 — Engagement & habit
- Build on the shipped on-device reminders + streaks: goal tracking, ethical nudges toward the daily
  plan (W2), and a "days to exam" cadence.
_Value: med · Effort: S · Deps: PWA notifications (shipped), W2 · Deploy: frontend/native._

---

## 4. Cross-cutting recommendations
- **Test coverage priority order:** scoring/grading, IRT/CAT item selection, SRS scheduling (W2),
  sync-outbox idempotency, and telemetry invariants (the A1 `totalAnswered === Σ(calendar)` test
  added this pass is the pattern — extend it to daily counters and the confidence matrix).
- **Data integrity as an invariant, not a hope:** A1 turned a recurring "numbers don't match" class
  into an enforced invariant. Apply the same "single server-authoritative source + uniform optimistic
  overlay" pattern to any other counter that's currently max()-merged.

## 5. Suggested sequencing
**W0 → (W1 + W3 in parallel) → W2 → W4 → W5/W6/W7/W8.** W1 and W3 deliver the most direct
"test/assess/analyze" value on the existing engine; W2 compounds them; W5–W8 harden and polish.
