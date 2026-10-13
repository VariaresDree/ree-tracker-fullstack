# REE Tracker: where things stand, and what's next

Handoff notes for the next planning session. Written 2026-10-13, after
[#143](https://github.com/VariaresDree/ree-tracker-fullstack/pull/143) and
[#144](https://github.com/VariaresDree/ree-tracker-fullstack/pull/144) were merged.
[`FEATURES.md`](../FEATURES.md) is the complete record of what the app does;
[`ROADMAP.md`](../ROADMAP.md) is the phase plan. This file is the short list.

## 1. What just shipped

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
- [ ] **Check the deploy ran the migrations.** The Render build runs `prisma migrate deploy`; its log should list the five migrations `20261011000000` to `20261015000000`.
- [ ] **Run the manual checks** listed in #144: the battle scenario on two devices, a card review cycle, a focus block, a mistake tag, a note, and a reminder (after the two items above).
- [ ] **Close the Phase 3 gate:** run one AI-generated batch through the review loop (edit and reject at least one item, approve the rest). See `ROADMAP.md`.

## 3. Known limits and debt (worth fixing)

**Battles**
- **One instance for live rooms.** There is no socket.io Redis adapter.
  - Completion is already safe across instances (a single DB transaction claims it).
  - Live broadcasts are not: running two backend instances needs `@socket.io/redis-adapter` and sticky sessions.
- **Battles that were live when #144 deployed** have no `BattleParticipant` rows. They close with no outcomes, and their players can't rejoin. This is one-off.
- **Spectating:** `GET /api/battles/:id/spectate` exists, but no screen uses it.

**Answer-key exposure** (fixed in the release after #144)
- `POST /api/exams/grade`, the bookmarks list, the mistakes list and today's loop now keep a question's key from a player while it is in a battle they're still in (`services/answerGate.js`). A non-player can still grade any question id; that only matters if one player hands the ids to someone else.

**List caps (no pagination yet)**
- Mistakes: the newest 300 questions, from the last 5,000 wrong attempts.
- Notes: the newest 1,000.
- Card reviews: every rated card.
- Add cursors if real accounts get near these.
- `QuestionAttempt (userId, isCorrect, createdAt)` is indexed now (migration `20261016000000_mistakes_index`).

**Formula-card reviews**
- No suspend/bury, no daily cap on new cards, no review history (only the latest schedule is kept).
- Rating happens only in study mode.

**Focus time**
- Logged blocks can be fixed or deleted from Habits › Recent blocks (the newest ten).
- The subject is fixed per block (switch mid-block and the whole block goes to the new subject).
- It's display only, by design: it never feeds θ or readiness.

**Reminders**
- Push is phone-app only. Web Push (VAPID) isn't built, so browser users get no scheduled reminder.
- Times are Manila hours. The server sends 04:00–23:00; other hours use the on-device reminder.
- GitHub cron can run 10+ minutes late, and it pauses after 60 days of repo inactivity.

**Code health**
- **Lint ratchet:** 31 errors at baseline, mostly `react-hooks/set-state-in-effect`, `react-hooks/purity` and `react-refresh/only-export-components`. Pay down a few per change.
- **Boot bundle:** 649 kB of the 700 kB budget (92.7%). Before adding anything to the shell, look at what `@ree/shared` and the shell pull in eagerly.

**Tests** (done in the release after #144)
- Signed-in Playwright specs run on the Firebase Auth emulator with the real backend (`ree-tracker/e2e-authed/`, CI "E2E (signed in)"). Add a spec there for each new signed-in flow.
- The two-client battle test lives in `tests/battleTwoClients.test.js`.
- CI applies the migrations to a real Postgres, checks them against `schema.prisma`, and runs `tests/integration/*.dbtest.js` (`npm run test:db`).

**Phase 2 gate:** axe now runs on Today and Progress › Habits in CI. Lighthouse on signed-in screens is still manual.

## 4. Ideas that would help learners (candidates for the next plan)

**Using the new data**
- ~~**One "Today" study loop**~~ shipped: due questions and open mistakes in one session by board weight, then the formula cards due. Mixing formula cards into the same session (not after it) is still open.
- **Study plan generator** (Progress › Study plan): include due cards and open mistakes per topic, and use focus-time share against PRC weight to rebalance the week.
- **Mistake patterns over time:** causes per week, and "you're misreading less". A mistakes-only mock: a timed set of open mistakes at board pace.
- **Formula ↔ question links:** a missed question surfaces the formula cards for its topic, and rating a card can queue two questions on it.
- **Focus goals:** a weekly target per subject from the PRC weights, with the Habits chart showing progress against it.

**Battles**
- Rematch, a battle history page with the per-question replay (`/replay` exists), and spectate.
- Ranked matchmaking by Elo (a queue rather than invite codes).

**Reach and polish**
- Web Push for browser users; a reminder minute, not just the hour; quiet days; a weekly summary push.
- iOS build (Capacitor), and Play Store signing.
- Search across notes; notes on topics as well as questions and cards; export the notebook to PDF.
- Offline: notes, mistakes and card reviews already paint from cache and queue writes. Practising a formula-card review offline works once the cards are cached.

## 5. Where the new code lives

**Battles**
- Backend: `ree-tracker-backend/src/services/battleLifecycle.js`, `src/sockets/battleSocket.js`, `src/routes/battleRoutes.js`, `src/utils/battleLogic.js`.
- Frontend: `ree-tracker/src/features/exams/ActiveBattles.jsx` and `src/hooks/useBattleSocket.js`.

**Notebook**
- Backend: `src/routes/{mistakeRoutes,noteRoutes}.js`, `src/services/mistakeView.js`.
- Frontend: `ree-tracker/src/features/notebook/*`.
- Shared: `packages/shared/src/notebook.js`.

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

House rules:
- Migrations are additive only. Generate the SQL with `prisma migrate diff`.
- New per-user routes go under `/api/user/...`.
- Owner-scoped writes use `userId: req.user.id`.
- Update `FEATURES.md` in every commit that changes a feature (see `CLAUDE.md`).
