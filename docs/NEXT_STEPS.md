# REE Tracker: where things stand, and what's next

Handoff notes for the next planning session. Written 2026-10-13, after
[#143](https://github.com/VariaresDree/ree-tracker-fullstack/pull/143) and
[#144](https://github.com/VariaresDree/ree-tracker-fullstack/pull/144) were merged;
updated for the polish-and-features release that followed (branch
`claude/jolly-cerf-yz78he`, section 1).
[`FEATURES.md`](../FEATURES.md) is the complete record of what the app does;
[`ROADMAP.md`](../ROADMAP.md) is the phase plan. This file is the short list.

## 1. What just shipped

**The polish-and-features release (after #153).** One commit per part:
- **Copy:**
  - plain names ("Start mock board", "Take a mock board");
  - plain server messages, with a backend copy guard;
  - Sync issues names each item by what it was;
  - honest web notification copy;
  - a next step on every empty state.
- **Onboarding and adaptive practice:**
  - a floor-aware "where to start";
  - the placement result leads with it and asks for the exam plan;
  - a first-run card, "Welcome" on a first visit, and "Early estimate" badges;
  - Today follows the plan for new learners;
  - an **Adaptive set** in Practice (`POST /api/exams/next-item` with `withKey`, falling back to an on-device picker offline).
- **Battles:**
  - Past battles in Exams › Battles;
  - a players-only replay with everyone's picks in a battle's review;
  - **Rematch** (migration `20261017000000_battle_rematch`).
- **Notebook and planner:**
  - a timed **Mistakes mock**;
  - "Why you miss, by week";
  - formula cards rated inside Today's loop;
  - a study plan weighted by open mistakes, with formula-card days.
- **Code health:**
  - lint ratchet 30 → **0**;
  - Practice no longer re-renders every second;
  - boot payload ~651 → **625 kB** (Firebase Storage is lazy, react-router chunked);
  - narrow store reads;
  - a focus block ends on time during exams;
  - dead code removed;
  - a module-name case guard.
- **Accessibility:**
  - ink tokens so every themed button and banner passes 4.5:1 in all 13 themes;
  - an `h1` in a running Practice session, and no skipped heading levels;
  - focus rings that survive forced colours;
  - keyboard-reachable admin rows;
  - 44px touch targets;
  - a tap-to-open glossary;
  - the Pomodoro gives way to the Scratchpad;
  - signed-in axe scans at WCAG 2.2 AA on six screens, a dark theme and a phone.

**#143: correctness, exam realism, a UI pass on every page.** Highlights:
- the PRC weighted-average verdict;
- the sitting review;
- the server-side Gauntlet ladder;
- the Exams/Progress/Library hubs.

**#144:**
1. **Battles always finish, and a player who left can come back.**
   - `BattleParticipant` rows hold each player's answers.
   - `services/battleLifecycle.js` settles a battle exactly once after its time limit plus 30 s, from the timer, a sweep or a read.
   - Return to battle restores your answers and the server's clock.
   - A running battle's review says when it opens.
2. **Notebook** (Library › Notebook):
   - mistakes derived from attempts, with cause tags, Fixed, and Practise these;
   - personal notes on questions and formula cards.
3. **Spaced repetition for formula cards:** Again / Hard / Good / Easy in study mode, "N cards due", and a Today action. SM-2 lives in `@ree/shared`.
4. **Focus-time logging** from the Pomodoro, with Progress › Habits › Focus time against the PRC weights.
5. **Scheduled reminders:** `POST /api/cron/reminders`, run hourly by `.github/workflows/reminders.yml`.

## 2. Owner actions (needed now)

- [x] **`GROQ_API_KEY` and `OPENROUTER_API_KEY` set on Render** (2026-10-13). Optional backup: `CEREBRAS_API_KEY`. Open Admin › AI models and press **Test all models**; a model shown as "Not offered" is skipped automatically, and can be replaced with `AI_CHAIN_<TASK>` on Render or in `src/config/aiModels.js`.
- [ ] **Check Render's build command** (backend service → Settings → Build Command) reads `npm install && npx prisma generate && npm run migrate:deploy`, as in `render.yaml`. A Blueprint-synced service picks it up by itself; otherwise paste it in. The old command still works, it just doesn't retry when the database's connection pooler is momentarily full.
- [ ] **Set `CRON_SECRET`.** Generate one long random string and set it in two places:
  - Render → the backend service → Environment;
  - GitHub → Settings → Secrets and variables → Actions.

  Until both are set the reminder route answers 503, and the workflow skips with a notice.
- [ ] **Finish push (Phase 4.2, user-side)**, per [`docs/mobile/capacitor-android.md`](./mobile/capacitor-android.md):
  1. Put `google-services.json` in `ree-tracker/android/app/`.
  2. Build in Android Studio.
  3. Flip the `push-notifications` flag (Admin).
  4. Verify with `POST /api/admin/push-test`.

  Scheduled reminders and streak pushes reach phones only after this. Until then the on-device reminder stands in.
- [ ] **Check the deploy ran the migrations.** The Render build runs `prisma migrate deploy`; its log should list the migrations `20261011000000` to `20261017000000` (the last is the battle rematch link).
- [ ] **Run the manual checks** listed in #144: the battle scenario on two devices, a card review cycle, a focus block, a mistake tag, a note, and a reminder (after the two items above).
- [ ] **Close the Phase 3 gate:** run one AI-generated batch through the review loop (edit and reject at least one item, approve the rest). See `ROADMAP.md`.

## 3. Known limits and debt (worth fixing)

**Battles**
- **One instance for live rooms.** There is no socket.io Redis adapter.
  - Completion is already safe across instances (a single DB transaction claims it).
  - Live broadcasts are not: running two backend instances needs `@socket.io/redis-adapter` and sticky sessions.
- **Battles that were live when #144 deployed** have no `BattleParticipant` rows. They close with no outcomes, and their players can't rejoin. This is one-off.
- **Spectating:** `GET /api/battles/:id/spectate` exists, but no screen uses it. It's players-only now, like `/replay`. A screen for anyone else watching needs an opt-in first (a "spectators allowed" setting on the battle).
- **Rematch** creates a new lobby with the same settings and tells the old room. There's no invite to a specific person (codes are still shared by hand), and a player who has left the results screen only sees it in Past battles.

**Answer-key exposure**
- A question's key stays closed to a player while it is in a battle they're still in (`services/answerGate.js`). That covers `POST /api/exams/grade`, bookmarks, mistakes, today's loop, `next-item`, the question lists (`GET /api/questions`, `POST /api/questions/review`) and a finished battle's replayed results.
- **Still open:** a non-player can grade any question id, which matters only if one player hands the ids to someone else. An offline pack downloaded before a battle already holds its keys; that's the cost of Practice grading offline.

**List caps (no pagination yet)**
- Mistakes: the newest 300 questions, from the last 5,000 wrong attempts.
- Notes: the newest 1,000.
- Card reviews: every rated card.
- Add cursors if real accounts get near these.

**Formula-card reviews**
- No suspend/bury, no daily cap on new cards, no review history (only the latest schedule is kept).
- Rating happens in study mode, and for up to 8 due cards inside Today's loop.
- **Study plan cards days:** a cards task is ticked off for good once its day's ratings reach the target. Before that, the count it shows comes from each card's *latest* rating, so a card rated again on a later day leaves the earlier day's count.

**Mistakes**
- "Why you miss, by week" counts one cause per question, at its latest miss (`MistakeTag` keeps one cause). A true per-miss trend needs a history table of tags.

**Adaptive set**
- One request per question, fetched while the solution shows. If `next-item` is slow, Next waits on it (with a spinner); after any failure the rest of the set is picked on the device.
- The cognitive-focus filter (Theory / Calculation) doesn't apply to it.

**Focus time**
- Logged blocks can be fixed or deleted from Habits › Recent blocks (the newest ten).
- The subject is fixed per block (switch mid-block and the whole block goes to the new subject).
- It's display only, by design: it never feeds θ or readiness.

**Reminders**
- Push is phone-app only. Web Push (VAPID) isn't built, so browser users get no scheduled reminder.
- Times are Manila hours. The server sends 04:00–23:00; other hours use the on-device reminder.
- GitHub cron can run 10+ minutes late, and it pauses after 60 days of repo inactivity.

**Code health**
- **Lint ratchet:** **0**. Keep it there; FEATURES.md (Quality gates) lists the patterns that replaced each rule's errors.
- **Boot bundle:** 625 kB of the 700 kB budget (89%). Before adding anything to the shell, look at what `@ree/shared` and the shell pull in eagerly.
- **Not done:** memoising `ExamNavigator`'s 100 buttons and `AnswerSheet`'s 400 bubbles. The exam clock no longer re-renders them every second, so they only re-render on an answer; worth it only if a profile on a low-end phone says so.
- **Rate limits:** 300 requests per signed-in learner per 15 minutes (`RATE_LIMIT_USER_MAX`), and a per-address flood guard of 3000 before sign-in (`RATE_LIMIT_GLOBAL_MAX`). Both are in memory, so with two backend instances each counts on its own (as with live battle rooms).

**Tests** (done in the release after #144)
- Signed-in Playwright specs run on the Firebase Auth emulator with the real backend (`ree-tracker/e2e-authed/`, CI "E2E (signed in)"). Add a spec there for each new signed-in flow.
- The two-client battle test lives in `tests/battleTwoClients.test.js`.
- CI applies the migrations to a real Postgres, checks them against `schema.prisma`, and runs `tests/integration/*.dbtest.js` (`npm run test:db`).
- `e2e-authed/screens.spec.ts` opens every screen and tab as a seeded admin and fails on any page error or error screen. Add new routes and tabs to its list.
- **Battle keys and the offline pack:** the question lists and next-item leave out a running battle's questions, but an offline pack downloaded before the battle already holds their keys. That's the cost of Practice grading offline; the battle's time limit is the real guard.

**Phase 2 gate:** axe runs in CI on Today, Habits, Exams, Library › Notebook, Progress › Overview and a running Practice session (WCAG 2.2 AA), plus Today in the ocean theme and on a phone. Lighthouse on signed-in screens is still manual.

## 4. Ideas that would help learners (candidates for the next plan)

**Using the new data**
- ~~**One "Today" study loop**~~ shipped, and the due formula cards now come in the same session (up to 8).
- ~~**Study plan generator** with cards and mistakes~~ shipped: open mistakes raise a topic's priority, and days with 5+ cards due get a cards task. Focus time is shown beside the plan, not fed in (display only by design).
- ~~**Mistake patterns over time** and a **mistakes-only mock**~~ shipped (Notebook › Mistakes).
- **Placement follow-up:** re-run the floor rule on the forecast's per-subject projections once a learner has history, so "where to start" keeps moving after the placement test.
- **Formula ↔ question links:** a missed question surfaces the formula cards for its topic, and rating a card can queue two questions on it.
- **Focus goals:** a weekly target per subject from the PRC weights, with the Habits chart showing progress against it.

**Battles**
- ~~Rematch, and a battle history with the per-question replay~~ shipped: Exams › Battles › Past battles, everyone's picks in a battle's review, and Rematch from the results, the review and the history. Spectate is still open (`/spectate` still serves any battle to anyone signed in).
- Ranked matchmaking by Elo (a queue rather than invite codes).

**Reach and polish** (left out of the last release by choice; still the next obvious set)
- An install prompt for the web app, data export (the notebook to PDF, answers to CSV), and an Admin switch for feature flags (`useFlag` already reads them).
- Web Push for browser users; a reminder minute, not just the hour; quiet days; a weekly summary push.
- iOS build (Capacitor), and Play Store signing.
- Search across notes; notes on topics as well as questions and cards; export the notebook to PDF.
- Offline: notes, mistakes and card reviews already paint from cache and queue writes. Practising a formula-card review offline works once the cards are cached.

## 5. Where the new code lives

**Battles**
- Backend: `ree-tracker-backend/src/services/battleLifecycle.js`, `src/sockets/battleSocket.js`, `src/routes/battleRoutes.js`, `src/utils/battleLogic.js`.
- Frontend: `ree-tracker/src/features/exams/ActiveBattles.jsx` and `src/hooks/useBattleSocket.js`.
- History, replay and Rematch:
  - backend: `src/services/battleCreate.js`, plus `GET /me/history`, `GET /:id/replay` and `POST /:id/rematch` in `battleRoutes.js`;
  - frontend: `features/exams/{BattleHistory,BattlePicks}.jsx` and `pages/SittingReview.jsx`.

**Onboarding and adaptive practice**
- `features/exams/startingPlan.js` (where to start) and `features/diagnostic/usePlacement.js`.
- `features/onboarding/FirstRunCard.jsx`, `features/analytics/earlyEstimate.js` and `features/today/todayActions.js` (`followPlacement`).
- Adaptive set: `features/active-recall/{adaptiveFallback.js,useReviewSession.js}`, `dbQueries.fetchNextItem`, and `next-item` in `examRoutes.js`.

**Notebook**
- Backend: `src/routes/{mistakeRoutes,noteRoutes}.js`, `src/services/mistakeView.js`.
- Frontend: `ree-tracker/src/features/notebook/*`. The Mistakes mock goes through `features/exams/review/retake.js`; cause trends are `causeWeeks.js` and `CauseTrend.jsx`.
- Shared: `packages/shared/src/notebook.js`.

**Today's loop and the study plan**
- Backend: `src/services/todayLoop.js` (cards with `?cards=1`) and `src/engine/plan.js` (`cardTasks`, the mistake boost).
- Frontend: `features/active-recall/LoopCardStep.jsx` and `features/reference/CardRatingButtons.jsx`.

**Card reviews**
- Backend: `src/routes/cardReviewRoutes.js`.
- Frontend: `ree-tracker/src/features/reference/{useCardReviews,ReferenceStudyMode,ReferenceBrowser}`.
- Shared: `packages/shared/src/srs.js`.

**Focus time**
- Frontend: `ree-tracker/src/utils/pomodoroLogic.js`, `src/hooks/usePomodoroClock.js`, `src/features/analytics/sections/FocusTime.jsx`.
- Backend: `src/routes/focusRoutes.js`, `src/services/focusTime.js`.

**Reminders**
- Backend: `src/services/reminderService.js`, `src/routes/{cronRoutes,reminderRoutes}.js`.
- Frontend: `ree-tracker/src/services/reminderPrefs.js`.
- Shared: `packages/shared/src/reminders.js`.
- Workflow: `.github/workflows/reminders.yml`.

## 6. How to validate a change

Run from the repo root:

```
npm run test --workspace=ree-tracker
DATABASE_URL=postgresql://localhost:5432/dummy npm run test --workspace=ree-tracker-backend
npm run lint:ratchet --workspace=ree-tracker        # must not rise above the baseline
VITE_BACKEND_URL=http://localhost:5000 npm run build --workspace=ree-tracker
npm run check:bundle --workspace=ree-tracker        # boot payload ≤ 700 kB
npm run check:sw --workspace=ree-tracker            # per-user routes stay out of the shared cache
npm run audit:all --workspace=ree-tracker-backend   # SQL interpolation, route auth/authz, secrets
cd ree-tracker-backend && DATABASE_URL=postgresql://localhost:5432/dummy npx prisma validate
```

With a local Postgres (CI runs both):

```
cd ree-tracker-backend && DATABASE_URL=… npx prisma migrate deploy && DATABASE_URL=… npm run test:db
cd ree-tracker && DATABASE_URL=… npm run e2e:authed   # Firebase Auth emulator + backend + Vite; PW_CHROMIUM_PATH for a local Chromium
```

House rules:
- Migrations are additive only. Generate the SQL with `prisma migrate diff`.
- New per-user routes go under `/api/user/...`.
- Owner-scoped writes use `userId: req.user.id`.
- Update `FEATURES.md` in every commit that changes a feature (see `CLAUDE.md`).
