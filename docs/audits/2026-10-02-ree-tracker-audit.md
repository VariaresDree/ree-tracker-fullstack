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

A handful of integrity bugs also silently lost or double-counted answers. Waves 0–2 fixed all of
these (#102–#116) and were **deployed on 2026-10-03** as merge `03c002b`; the operator steps are
done (see the end of this document). Wave 3 shipped as #123–#128 (2026-10-03); what remains is listed under it.

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

## Wave 2 — shipped (2026-10-03)

| Item | PR |
|---|---|
| Pending writes are owner-stamped; failed battle writes retry in the background; BKT/SRS fold in answer order | #112 |
| Sittings are finalised server-side; mock history is served by the API (the local ledger is retired); "remove" hides a sitting rather than deleting it; stuck outbox writes give up after 20 tries | #113 |
| The full PRC board: Math → ESAS → EE on the PRC clock, results withheld until the end, one server session | #114 |
| A cross-session blind-spot and time-sink registry with actions; a daily readiness snapshot and a trend | #115 |
| Planner v2: mastery × weight allocation, weekly sittings, launchable tasks that complete themselves | #116 |

**Decision closed (2026-10-03): no change needed.** `UserTopicPerformance` is unique on `(userId, topic)`, so a topic name used in two subjects would merge into one row.
- Production has **0** cross-subject topic-name collisions, so nothing merges today.
- Changing the unique constraint is not additive and would need a rebuild from attempts. That cost buys nothing while names stay unique per subject.

## Original Wave 2 plan (for reference)

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
  - add subject to the `UserTopicPerformance` conflict key (same-named subtopics merge across subjects). *Closed: not needed, see above.*

## Wave 3 — shipped (2026-10-03, #123–#128)

| Item | PR |
|---|---|
| Planner v2.1, from the first live plan. Subjects are paced, not run back to back (days 1–15 had all been EE). Drills are sized to one Smart Drill session (120 → ≤50). Untouched topics link to their Topic row | #123 |
| Every theme meets WCAG AA. A computed contrast test covers the 13 themes; 78 failing pairs were fixed, including "Correct" at 1.6–1.9:1 and wrong answers at 80% opacity | #124 |
| Answer feedback without colour: a graded-answer announcement, navigator state names plus `aria-current`, clock milestones, flashcard focus | #125 |
| A `touch-target` utility (44 px on coarse pointers) on every audited control. The drawer is inert while closed. Scratchpad is a real dialog with a DPR-sized canvas. Footers wrap | #126 |
| The **sticky exam toolbar and clock no longer scroll away**: `<main>` used `overflow-y-auto`, which captured sticky children. `.page-fade-in` no longer leaves a transform behind. The `animate-in` family is defined (~190 uses, plugin never installed). Skip link. h1 on Active Review, Board Simulator and Login | #127 |
| ESLint runs in CI as a per-rule ratchet (157 legacy errors, none added). LaTeX memo/prose fixes and a malformed-formula test. Formula boxes show their scrollbar. A Pixel 7 Playwright project | #128 |

**Still open after Wave 3:**
- **Headings on the remaining pages.** Arena, Profile, Materials, Battle and Gauntlet need an h1 without creating h1→h3 skips, because child components bring their own h3s. Do this with a rendered axe pass, not blind.
- **Authed-screen axe and Lighthouse** via the Firebase emulator. This is the tool for the item above.
- **Sentry (free tier).** Needs a DSN from the owner.
- **A "which mode do I use?" guide**, tied to the placement result.
- **Paying down the lint baseline.** 103 unused variables are mechanical. The 18 `set-state-in-effect` errors need care.
- **`aiModels.js` default ids** against Google's live model list.
- **Inconsistent naming** across nav, page titles and copy.

## Wave 3 as planned (for reference)

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

## Post-deploy finding: topic taxonomy drift (2026-10-03)

Verified read-only against production right after the deploy:
- **2,176 live questions have no `topicId`.** Most were created 2026-06-17 to 07-18, before the TOS editor created the `Topic` table.
- 2,136 of them match an existing topic **exactly** by name within their subject, after canonicalising 'Math' to 'Mathematics'. None needs a label rewrite.
- 40 match nothing: EE "Transient Response" (35, created 2026-09-28) and EE "AC Impedance" (5, created 2026-09-22).
- 251 of 919 attempts are on untagged questions. Analytics still count them by name, but topic-targeted Smart Drill and CAT draw only tagged items.

Root cause of the new drift:
- The Library's AI ingestion built its prompt from the **static** fallback topic list in `ree-tracker/src/config/constants.js`. That list had 28 EE topics that the live `Topic` table (18 EE) does not have.
- Boot applied the live list only **after** the profile request succeeded, so a cold-start timeout left the stale list in the Topic dropdown as well.
- The server published unmatched labels with `topicId` NULL, silently.

Fixed in #117:
- AI prompts and the Library dropdown now use the live taxonomy (`GET /api/config/tos`). Boot applies it independently of the profile request, and the Library re-pulls it when opened.
- Every live-question write resolves its topic within the question's own subject. A label outside that subject's taxonomy is refused instead of published untagged:
  - manual add and single approve answer 400 with the reason;
  - Accept All leaves such rows in the queue as `unknown-topic`.
- The review queue flags off-syllabus items and leaves them out of Accept All.
- `scripts/linkQuestionTopics.js` links untagged questions to existing topics only. The 40 unmatched questions get reviewed remaps to existing topics: "Transient Response" → "Electrical Transient Analysis" and "AC Impedance" → "Electric Circuits 2", the AC-circuits course.
- `scripts/migrateTaxonomy.js` now refuses to seed while the taxonomy is managed by the TOS editor.

**migrate:taxonomy must not be run on production.** Its seed (`src/config/prcTaxonomy.js`, 49 topics) diverged from the live taxonomy. A dry run reported "43 to create, 6 to update", which would create 43 parallel topics and split analytics. It now refuses unless `--force` is passed.

## Deployment and operator steps (Waves 0–2) — done

Deployed 2026-10-03 as merge `03c002b`. Render's `prisma migrate deploy` applied four additive migrations:
- `20261002000000_user_prior_se_default`
- `20261002010000_topic_last_practiced`
- `20261002020000_forecast_subject_projection`
- `20261003000000_planner_task_links`

Operator steps, all run:
1. `npm run audit:difficulty` gate: **passed**. 99.4% of 14,874 items use the 1/2/3 ordinal; 0 are calibrated.
2. `npm run calibrate`: 0 items fitted; 10 per-subject abilities rewritten on the corrected scale.
3. `npm run recompute:theta`: 5 users. θ dropped about 2 points, as expected after the 1/2/3 → b −1/0/+1 fix.
4. `npm run backfill:mastery`: 119 rows, with `lastPracticedAt` filled.
5. `npm run seed:syllabus`: 25 / 30 / 45.
6. `npm run migrate:taxonomy`: **deliberately not run** (see the finding above).

Run once the taxonomy-drift fix (#117) was deployed:
1. `npm run link:topics`, a read-only dry run. Expect all 2,176 linked: 2,136 exact matches plus 40 through the reviewed remaps, each relabelled to its topic's name. Expect 0 unmatched.
2. `npm run link:topics:apply`.
3. `npm run backfill:mastery`, so `UserTopicPerformance.topicId` follows.

If the dry run still lists unmatched groups, a remap target was renamed or deactivated (the report names it). Re-tag those questions in the Library vault editor, or add the topic in the TOS manager, then re-run steps 1–3.

**Done 2026-10-03** (#117 deployed as `a9bfa13`):
- the dry run matched (2,176 in 42 groups, 0 unmatched, only the 2 remaps relabelled);
- apply linked all 2,176;
- `backfill:mastery` wrote 118 rows.

0 untagged questions remain. The old backfill left one learner's "AC Impedance" row orphaned, and its attempts were missing from "Electric Circuits 2"; an admin merged them by hand.

A full check of every `UserTopicPerformance` row against attempt history then found 3 rows, one learner's, counted 1–2 attempts high: residue of the pre-#102 in-batch double count. The rebuilt `backfill:mastery` corrects them. Its read-only dry run on production reports exactly those 3 corrections, 0 new rows and 0 removals.

Run 2026-10-03 after #118 merged (`e21eac4`), with approval: `npm run backfill:mastery` applied exactly those 3 corrections, with 0 rows created and 0 removed. A read-only check then found all 118 rows matching attempt history on attempts, correct and seconds.

Follow-up (#120): removing an orphaned row now needs proof. #118 removed every row whose label had no attempts left. A row is now removed only when the answers recorded under its label (`QuestionAttempt.subtopic`, the key telemetry wrote them to) all count under another row and cover its whole tally; that is the "AC Impedance" case. Any other orphan is reported on a `?` line and left alone:
- `no-history`: nothing was recorded under it, e.g. its questions were deleted;
- `uncovered`: it counts more than history recorded under it.

Each removal names the rows its answers now count under. The run above had 0 orphans, so its outcome would have been the same. Before applying any later run, read every `-` and `?` line of the dry run.

Stacked PRs only run the full CI suite once they target `main`. Each was verified locally:
- backend: 592 tests;
- frontend: 409 tests;
- build, boot budget (88% of 700 kB), SW matcher, and the SQL / route-auth / secret guards.
