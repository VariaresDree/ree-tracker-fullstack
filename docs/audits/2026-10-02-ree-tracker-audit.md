# REE Tracker — System Audit (2026-10-02)

Scope: the whole monorepo at `074601a` (`packages/shared`, `ree-tracker`, `ree-tracker-backend`).
The lens: does the app **track, test, assess and analyze** a PRC REE candidate correctly?

Method:
- three read-only code audits, one each for:
  - the assessment and practice engines;
  - UI/UX and accessibility;
  - psychometrics, shared rules and offline sync;
- every P0/P1 claim was re-verified by reading the code;
- each fix shipped with a test that fails without it.

Severity:
- **P0**: loses or corrupts learner data, or gives a wrong verdict.
- **P1**: a core feature is broken or unreachable.
- **P2**: degraded accuracy or UX.
- **P3**: polish.

## Headline

The app is mature: 3PL IRT, BKT, calibration, an offline outbox and an AI review loop are all
present. But several engines were **built and not connected**:
- spaced repetition never wrote a card;
- the adaptive (CAT) picker had no caller;
- the "pass probability" ignored the PRC rule.

A handful of integrity bugs also silently lost or double-counted answers. Waves 0–1 fix all of
these in nine stacked PRs; Waves 2–3 are planned below.

## P0 — data integrity and verdict correctness (fixed)

| Finding | Where | Fixed in |
|---|---|---|
| A sync queue over 500 answers was sent in one POST (the server cap is 500), drew a 400 classified as permanent, and **every queued answer was dead-lettered** | `store/useStore.js` `flushQueueToCloud` | #103 |
| Dead letters kept ids only and nothing displayed them, so quarantined answers were unrecoverable and invisible | `store/useStore.js` | #103 |
| **Every keyboard answer in Active Review was recorded twice**: page-level and `QuestionCard` hotkeys both fired, each under its own uuid | `pages/ActiveReview.jsx`, `MCQMode.jsx` | #103 |
| `/exams/grade` swallowed a persistence failure and answered 200. The Gauntlet outbox dropped the run and idempotency replayed the 200 for 24h | `routes/examRoutes.js` | #102 |
| A `clientAttemptId` repeated within one batch was inserted once but **counted twice** into BKT, rollups, θ and session counters | `services/telemetryHelpers.js` | #102 |
| The verdict was judged on the **raw** percentage, not the PRC **weighted** 25/30/45 average. A 90/60/64 sitting passed (71.3% raw; 69.3% weighted) | sim, battles, `examService`, Score History | #104 |
| Score History ignored the subject floor: 70% overall with Math at 40% read PASSED | `services/deepAnalyticsHelpers.js` | #104 |
| Uncalibrated items used the **1/2/3 author ordinal as IRT b**, so a typical item sat at b = 2 and **θ was biased upward for everyone**. A 60%-correct record estimated θ > 1.5 | every 3PL consumer | #105 |
| The device-local mock ledger was one unscoped key, so the next account on a shared phone saw the previous user's history | `services/dbQueries.js` | #103 |

## P1 — core features broken or unreachable (fixed)

| Finding | Fixed in |
|---|---|
| **SRS dead end to end**: the client SM-2 hook was imported nowhere, `POST /srs/review` trusted client intervals and had no caller, so no card was ever written and `/due` was always empty | #106 |
| The **pass forecast was P(global θ > 0)**. It ignored the weighted average, the 50% subject floor and per-subject ability, so it could not see a conditional result | #107 |
| Smart Drill **stripped answers**, so every drill MCQ graded wrong on the client. It ranked by raw accuracy and served flagged items | #108 |
| The "Weak points" custom scope ran a plain Mathematics library session | #108 |
| The **CAT picker had no caller**, read the same 80 unordered rows every call, and always served the single best item | #109 |
| **No placement**: every account started at θ = 0 with no per-subject ability | #109 |
| `POST /tasks/generate-plan` and `DELETE /tasks/:id` were nested inside the clear-plan handler, so they **404'd on a fresh server** | #102 |
| PRC Math sitting was 4h. The current schedule is **Math 5h · ESAS 4h · EE 6h**, now one shared constant | #104 |

## P2 — accuracy and UX (fixed)

- **Unanswered sim items defaulted to HIGH confidence**, so every blank was a "blind spot" (#104).
- **Results colour** used old 70/60 score bands instead of the verdict (#104).
- **Blended item split**: a 10-item blend became 11 items; there is now one largest-remainder rule (#104).
- **Missing-SE fallbacks** disagreed (0.5 / 1 / 1 / 1.0), new users started at a tight SE of 0.5, and a purge kept the old SE (#105).
- **BKT had no forgetting**: mastery now decays with time since practice, and the heatmap shows "fading" (#106).
- **Weak topics** came from the 20 most-recent topics by hit rate. They are now every topic, by decayed mastery × syllabus weight, with blind-spot and time-sink flags (#107).
- **θ→% mappings**: three different ones appeared on one dashboard (#107).
- **Dashboard hierarchy**:
  - the next action was about 10 cards down on mobile;
  - the readiness breakdown was never rendered;
  - the KPI flashed a θ stand-in;
  - "Generate report" appeared twice;
  - three hand-rolled dialogs had no Escape or dialog role (#110).

## Psychometric engine — verified

| Check | Result |
|---|---|
| θ clamp | ±4 ✓ |
| SE floor | 0.35 ✓ |
| Estimator | Bayesian MAP with Fisher scoring ✓ |
| BKT update | Atomic with the attempt write (same transaction, under the user row lock) ✓ |
| Mastery bands | 85 / 65 / 45. Now one shared definition, `MASTERY_BANDS`, in `@ree/shared` |
| Forecast v2 | TCC per subject from a bank sample; 2,000 seeded Monte Carlo sittings graded by the shared PRC rule. A precompiled grader is held to identical output by a 5,000-case contract test. ~20 ms per compute |

## Still open: Wave 2 (test realism and analytics depth)

- **Full PRC board mode**:
  - 3 sequential timed sections (Math 100/5h, ESAS 100/4h, EE 100/6h) with breaks and multi-day resume;
  - server finalisation of `ExamSession` with subject scores and weighted GWA. Telemetry-created sessions stay `IN_PROGRESS` forever.
- **Server-backed mock history** with per-subject lines, retiring the device-local ledger.
- **Cross-session analysis**:
  - a blind-spot and time-sink registry in Deep analytics;
  - a daily `ReadinessSnapshot` write, so a readiness **trend** exists (it is never written today).
- **Planner v2**:
  - tasks linked to a topic and a session preset;
  - auto-completed by matching sessions;
  - volume set by days-to-exam × mastery gap × weight. Today it ignores the client's weights and uses raw accuracy.
- **Sync hardening**:
  - owner check on `pendingWrites`;
  - retry when the battle `recordAttempts` fails;
  - fold BKT in `answeredAt` order;
  - add subject to the `UserTopicPerformance` conflict key (same-named subtopics merge across subjects).

## Still open: Wave 3 (UI/UX, accessibility and platform)

- **Touch targets under 44 px on coarse pointers:**
  - hamburger, sidebar collapse, heatmap toggles, Scratchpad buttons;
  - Regenerate, FloatingPomodoro, CaqRunner cells;
  - planner and calendar arrows, Cloud Vault actions (hover-only on touch);
  - ledger delete, show-password.
- **Answer feedback:**
  - no `aria-live` result announcement;
  - success colour #34d399 is **1.6–1.9:1** on the light, paper and sakura themes;
  - navigator cells show answered state by colour only;
  - flashcard focus drops to `<body>`.
- **Contrast:** `--text-muted` fails on `surface3` in about 10 of 13 themes, and `--text-muted2` fails in light, sakura and ocean. A computed WCAG test is needed, since axe in jsdom cannot paint.
- **Overlays:** Scratchpad has no dialog semantics, Escape or DPR-correct canvas; the closed mobile drawer stays in the tab order; no safe-area insets; Modal footer doesn't wrap.
- **KaTeX:** no malformed-LaTeX test; the memo ignores `compact`; scrollbars are hidden on explanations; the `prose` classes are dead.
- **Navigation:** h1 missing on most pages; no skip link; inconsistent naming; no "which mode do I use?" guide.
- **Dead CSS:** `animate-in`/`fade-in` (66 uses, no plugin) and sticky toolbars inside a scrolling `main`.
- **Platform:**
  - error tracking (Sentry free tier);
  - ESLint in CI;
  - a mobile-viewport Playwright project;
  - authed-screen axe via the Firebase emulator;
  - verify the `aiModels.js` default ids against Google's live list.

## Operator steps for Waves 0–1

Merge #102 → #110 in order. Render runs `prisma migrate deploy`, which applies three additive migrations:
- `20261002000000_user_prior_se_default`
- `20261002010000_topic_last_practiced`
- `20261002020000_forecast_subject_projection`

Then:
1. `npm run audit:difficulty` (read-only) **before** deploying #105, to confirm the 1/2/3 assumption against production.
2. After deploy: `npm run recompute:theta`, once. It re-derives θ on the corrected scale.
3. After deploy: `npm run backfill:mastery`, once. It now also fills `lastPracticedAt`.
4. The earlier rollout scripts listed in `ROADMAP.md` are still pending.

Stacked PRs only run the full CI suite once they target `main`. Each was verified locally:
- backend: 592 tests;
- frontend: 409 tests;
- build, boot budget (88% of 700 kB), SW matcher, and the SQL / route-auth / secret guards.
