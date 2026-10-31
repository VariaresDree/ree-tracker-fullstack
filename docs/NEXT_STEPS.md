# REE Tracker: where things stand, and what's next

Handoff notes for the next planning session. **Section 0 is the latest (2026-10-31).** First written 2026-10-13, after
[#143](https://github.com/VariaresDree/ree-tracker-fullstack/pull/143) and
[#144](https://github.com/VariaresDree/ree-tracker-fullstack/pull/144) were merged;
updated for the three releases that followed (branch `claude/jolly-cerf-yz78he`,
section 1).
[`FEATURES.md`](../FEATURES.md) is the complete record of what the app does;
[`ROADMAP.md`](../ROADMAP.md) is the phase plan. This file is the short list.

## 0. Handover, 2026-10-31 (read this first)

Main is at `74647df` (#190), live on Vercel and Render. Fifteen PRs merged since 2026-10-28, in two rounds.

### What shipped

| PRs | Round | What |
|---|---|---|
| #176–#185 | CELE tracker → REE | Rating calculator; fuller outside-score log; key dates and rest days; optional review-center mode with lectures; sets to finish; your own links; topic self-rating and high-yield; review phases and playbook; shading reminder; accuracy by time of day; printable weak formulas and random topic. Mapping in `REE_IDEAL_APP_ROADMAP.md` §6. |
| #186 | Reliability A | Admin AI finishes. The server parses every JSON answer (`parseModelJson`, `@ree/shared`), Groq's `json_validate_failed` is salvaged, models that are listed but refused are skipped, each admin model gets about 45% of the budget, and the client retries once. Photos are scaled to 1600 px; ₱ renders inside math. |
| #187 | Reliability B | Back online without a reload: a half-open breaker and a reconnect key (`services/connection.js`), screens fetch again on recovery, a **Reconnecting…** pill, a fresh socket token, `lazyWithRetry`. |
| #188 | Reliability C | Formula cards are formulas and constants only (concept cards retired, re-typed in Admin). No note button. Subject → Topic browsing, a **Quick sheet**, a plainer card face, and Admin **From a file**. |
| #189 | Reliability D | Library tabs: Handouts (default, with **Your links** under it), Formula cards, Unit conversion (**Soon**), Notebook, Bookmarks, Imported quizzes. |
| #190 | Update delivery | New versions reach every device, never mid-exam (`services/appUpdate.js`). See the incident below. |

### Incident: merged and deployed, but not on devices

**What happened.** #187 set the service worker to `prompt` so that an update wouldn't reload the page mid-question. A new version then waited until every tab and installed-app window was closed, so #188 and #189 sat unused for hours.

**Fixed in #190:**
- **Takeover:** `registerType: 'autoUpdate'` again.
- **Reload timing is the app's** (`onNeedReload` → `onNewVersionReady`): calm screens only, never exam or practice screens.
- **Update checks:** every 15 minutes, on returning to the app, and on coming back online.
- **Self-heal:** a `/version.json` beacon is compared with the build that's running; a stuck worker is cleared, once per version.
- **Visible version:** Account › About this app shows it, with **Check for updates**.
- **Guard:** `check:sw` fails the build if `sw.js` loses `skipWaiting()`/`clientsClaim()`, or if the beacon is missing or precached.

**Rules from this:**
- Never go back to `prompt`.
- When something is "merged but not live", first compare the live chunk on Vercel with Account › About this app on the device.

### Verified live today (2026-10-31, signed in as admin in the app's browser pane)

- **Version and update path.** `/version.json` is `74647df`, served `no-store`. The live `sw.js` has `self.skipWaiting()` and `clientsClaim()`. One `registration.update()` moved a #189 tab to the new worker with no waiting step, and the next load showed **Version 74647df**. **Check for updates** works.
- **Library.** The tab order is right, Handouts is the default, and **Your links** sits under the handouts.
- **Formula cards.** The kinds are All / Formulas / Constants: EE 11 + 3, ESAS 8 + 6, Math 12 + 6. There is no "Add a note". The EE Quick sheet renders topic headings, 14 rows and no KaTeX errors.
- **Admin › Formula cards.** **From a file** and its file input are there. No retired concept cards are listed.
- **Admin › AI models.**
  - Groq: 11 models. OpenRouter: 420 (19 free). Gemini: 60. Cerebras: **no key**.
  - Every feature's first model works.
  - `gemini-2.5-pro` is out of every chain. The picks resolve to current models (Qwen3.8, Nemotron 3 Ultra, Gemma 4 31B, Gemini 3.1 Pro preview), so no keyword update is needed yet.
  - Two backups are rate limited on free quota: Gemini 3.1 Pro preview and OpenRouter's Gemma 4 26B.

### Not verified yet (do these first next session)

1. **Admin AI end to end on Render:** generate 10 questions with the double-check, extract from a full-size phone photo, and **From a file** on a short reviewer (photos and a PDF). Each must finish without a 502. This step was skipped this session because it spends shared free quota.
2. **Offline drill:** with DevTools offline for about 20 s, Today, Progress and Library heal without a reload. Also do a cold start after more than 15 minutes idle.
3. **The update path on a phone:** the installed app reaches the next deploy by itself, and the reload waits while on `/simulator`.
4. **Learner screens on a phone** (375 px): Quick sheet, Your links under Handouts, the Unit conversion tab.
5. **Signed-in e2e passed on #190's CI;** nothing else is owed there.

### Owner actions (new)

- [ ] **On every device, close every REE.ai tab and the installed app once, then reopen.** A tab still on #187–#189 needs one more load to get #190's update code; after that, updates arrive by themselves.
- [ ] **Optional: set `CEREBRAS_API_KEY` on Render** (free). It fills the second slot of the writing, explain and practice chains, which are empty now.
- [ ] **Gemini 3.1 Pro preview is over its free quota.** It is the sixth model in admin writing, so it costs one quick 429 at worst. Either leave it, or use a paid Gemini key if you want Pro answering.
- [ ] **Delete the test key date "LIVE CHECK preboard"** on the Variares account (Progress › Study plan › Key dates), left from the CELE live check.

### Improvements and next features (prioritised)

**P1: reliability and visibility**
1. **Know who's stale:** send `X-App-Version` with every API request. The server logs it, and Admin shows the versions in use this week. The #190 incident would have been visible in minutes.
2. **Sentry (or similar) for the client and the server.** The DSN has been open since the October audit. Unhandled errors, chunk-load failures and AI exhaustion would show up without a user report.
3. **Long admin AI work as server jobs:** generation, from-a-file and the double-check would run as a background job with progress polling, instead of a 110 s HTTP request per batch. Batches survive a closed tab, and Render's request window stops mattering.
4. **From a file reads PDF pages as images:** render each page with pdf.js to a canvas, then send it to the vision chain. PDF text loses fractions, subscripts and square roots, so formula sheets come out better from images.
5. **Render cold starts** (30–60 s) remain the single biggest wait. Options:
   - Starter plan;
   - caching read-mostly endpoints (TOS, flags, reference cards) at the edge;
   - an always-on keepalive while the app is open.
6. **Multi-device:** the first answer of the day can undercount, and the streak can flicker (open since #137).

**P2: UI and UX**
1. **Quick sheet as a self-test:** a **Hide answers** toggle that blanks the formula column until tapped, and **Print this sheet** (reusing the weak-formula print styles) for a whole subject or topic.
2. **Notebook › My notes:** card notes now live only there. Show each with its card (formula preview, a link to open the card), since the card itself no longer shows the note.
3. **Library › Handouts:** search across handout titles and folders, and **Recently opened** at the top.
4. **The Reconnecting… pill on phones:** it lives in the sidebar badge. Confirm the phone header shows the same state, and add it if not.
5. **Today's density:** the countdown, phase pill, lead card and tiles compete on a phone. Consider one hero and a collapsible "More for today".
6. **Accessibility:** the rendered-axe heading pass and a dark-theme contrast sweep (open since the October audit).
7. **First-run tour** of the five destinations, and what to do on day one: placement test, then exam date, then plan.

**P3: features**
1. **Unit conversion** (the tab is waiting): power (kW / hp / BTU/h), wire sizes (kcmil / mm² / AWG), temperature, energy, per-unit to a new base, and Δ–Y.
   - Offline, with pure functions in `@ree/shared`.
   - Each conversion links to its formula card.
2. **Local-first handouts and links:** files and links kept only on the device (IndexedDB or OPFS), working offline, with no server copy. This is the second half of the Handouts design.
3. **Two-day board:** `User.examDate` holds one date, but the REE board runs over two. The countdown, phases and plan should know both days.
4. **Review-center import:** a lecture schedule from CSV or an `.ics` calendar, instead of typing it in.
5. **Formula-card recall drill:** show a card's name and ask for the formula, self-graded, feeding the same spaced review.

### Working notes for the next session

- **Worktree first:** in a fresh worktree run `npm ci` first. Branch each PR from a freshly pulled `main`; the user merges, then asks for the next step.
- **Gates:**
  - root `npm test`;
  - in `ree-tracker`: `npm run lint:ratchet` (baseline 0); `VITE_BACKEND_URL=http://localhost:5000 npx vite build`; `npm run check:sw`; `npm run check:bundle`;
  - in `ree-tracker-backend`: `npm run audit:auth`.
- **Known flake:** `PrintSet` "edits an item in place" times out only under full-suite load. A test waiting on a lazy chunk needs `{ timeout: 5000 }`.
- **Shell edits on Windows:** bash heredocs that hold Python sometimes fail to parse. Write a temp `.py` file, or use the Edit tool.
- **FEATURES.md** is updated in every PR (`CLAUDE.md`).
- **E2E coupling:** before changing screen copy, check `e2e-authed/` (the sign-in waits on Today's "Up next").
- **Live checks:** use the app's browser pane, signed in. The pane can screenshot a blank main area; use `zoom` or read the DOM.

## 1. What just shipped

**The trust-the-bank release (after #156).** Verified first (2026-10-19): CI green, Vercel on ceb38ef with no runtime errors, `/healthz` all ok (Groq, OpenRouter, Gemini), migrations through `20261018000000` applied, CRON_SECRET working. Then:
- **The key is always one of the options:** `matchOption` (`@ree/shared`) gives a key its option's exact text when it differs only in form (`$`, spacing, a label, a closing full stop), and every live write refuses a key that matches no option.
- **Answer positions fixes keys in one press** (`POST /api/questions/option-audit/fix-keys`). The live bank had 4 ungradeable rows; 3 are fixable this way, the 4th has two identical options and needs a hand edit.
- **The app wakes the backend when it opens** (`services/wakeBackend.js`), because GitHub ran the 10-minute keepalive only every 2 to 6 hours.
- **RLS on every table** (`20261019000000_rls_on_every_table`), with a DB test that fails on a new table without it.

**The shuffled-choices release (after #155).** Pressing A every time scored close to half a session: the key was stored first far more often than not. One commit per part, then the review's fixes:
- **One seeded order** (`@ree/shared` `optionOrder`): an unbiased shuffle keyed on the sitting and the question. "All of the above" stays last; a question whose choices name others by letter ("Both A and B") keeps its order.
- **Every answering screen** shows it, stable within a sitting (reloads, Next/Back, battle rejoins) and new each sitting: Practice and everything it runs, the Board Simulator, battles (questions too, per player), the Gauntlet, the placement test, Bookmarks and the printed paper. Grading compares text, so nothing else changed.
- **Reviews show the order seen,** rebuilt on the server from the sitting's id when the sitting is tagged `optionOrder: 'seeded-v1'` (no migration).
- **No lean at the source:** new questions are stored shuffled (submit, create, publish); grid edits keep each choice in its slot; the AI prompts ask for a random key position and no "option B" in explanations. **Admin › Question bank › Answer positions** shows the key's share per letter and the rows to fix.
- Checked in a browser: always pressing A in Practice got 5 of 19 right, with the key spread over A–D; a mock board kept its order through a reload and in its review, and the next sitting drew new orders.

**The learning-loop release (after #154).** One commit per part:
- **Hardening:**
  - `GET /api/battles/:id/spectate` is players-only, like `/replay`;
  - a request budget per signed-in learner (300 per 15 minutes, `RATE_LIMIT_USER_MAX`), so a class on one Wi-Fi no longer shares one budget; the per-address limit stays as a flood guard (3000, `RATE_LIMIT_GLOBAL_MAX`);
  - `e2e-authed/screens.spec.ts` opens every screen and tab as a seeded admin and fails on any page error or error screen.
- **Where to start keeps moving:** past 30 answers, Today applies the floor rule to the forecast's projections. A subject projected under 50% gets "Lift ESAS above the 50% floor" right after the loop.
- **Formula cards ↔ questions:**
  - a missed question links to its topic's cards (Practice, a sitting's review, Notebook › Mistakes);
  - Formula cards opens at a topic (`{ subject, topic }` state);
  - a card review ends with "Practise these topics", two questions on each topic rated.
- **Weekly focus goal:** Progress › Habits › Focus time › This week, against a goal in hours, split by board weight (migration `20261018000000_weekly_focus_goal`).

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

- [x] **Keepalive moved off GitHub's scheduler** (2026-10-19), which ran it every 2 to 6 hours. The Supabase job `keep-backend-awake` (`pg_cron` + `pg_net`) calls `GET /health` every 10 minutes, 06:00–23:59 Manila. See it with `select * from cron.job;`, its results in `net._http_response`; remove it with `select cron.unschedule('keep-backend-awake');`. The GitHub workflow stays as the `/healthz` check.
- [x] **After the deploy, open Admin › Question bank › Answer positions** and press **Use the option's text** for the 3 fixable keys; give question `201494a1…` (two identical options, "F = A'B'C + A'BC' + AB") a real fourth option and key by hand.
- [ ] **Fix the questions Answer positions lists under "math that may not render" and "two identical options"** (36 and 11 on 2026-10-19), by pressing each id to open it in the editor. Question `201494a1…`'s third option ends in a stray `$$` (`$F = A'B'C + A'BC' + AB'$$`); drop one `$`.
- [x] **`GROQ_API_KEY` and `OPENROUTER_API_KEY` set on Render** (2026-10-13). Optional backup: `CEREBRAS_API_KEY`. Open Admin › AI models and press **Test all models**; a model shown as "Not offered" is skipped automatically, and can be replaced with `AI_CHAIN_<TASK>` on Render or in `src/config/aiModels.js`.
- [ ] **Check Render's build command** (backend service → Settings → Build Command) reads `npm install && npx prisma generate && npm run migrate:deploy`, as in `render.yaml`. A Blueprint-synced service picks it up by itself; otherwise paste it in. The old command still works, it just doesn't retry when the database's connection pooler is momentarily full.
- [x] **Set `CRON_SECRET`** (done 2026-10-13; the reminders run answers 200). Generate one long random string and set it in two places:
  - Render → the backend service → Environment;
  - GitHub → Settings → Secrets and variables → Actions.

  Until both are set the reminder route answers 503, and the workflow skips with a notice.
- [ ] **Finish push (Phase 4.2, user-side)**, per [`docs/mobile/capacitor-android.md`](./mobile/capacitor-android.md):
  1. Put `google-services.json` in `ree-tracker/android/app/`.
  2. Build in Android Studio.
  3. Flip the `push-notifications` flag (Admin).
  4. Verify with `POST /api/admin/push-test`.

  Scheduled reminders and streak pushes reach phones only after this. Until then the on-device reminder stands in.
- [x] **Check the deploy ran the migrations** (checked in the database 2026-10-19: through `20261018000000`). The Render build runs `prisma migrate deploy`; its log should list the migrations `20261011000000` to `20261018000000` (the last two are the battle rematch link and the weekly focus goal).
- [ ] **Run the manual checks** listed in #144: the battle scenario on two devices, a card review cycle, a focus block, a mistake tag, a note, and a reminder (after the two items above).
- [ ] **Open Admin › Question bank › Answer positions** after the deploy. Reword the explanations it lists as naming an option by letter ("option B is wrong"): the choices are shuffled now, so those letters no longer match. Fix any answer it lists as not one of its options (those can't be graded). Existing rows keep their stored order by design; learners never see it any more.
- [ ] **Close the Phase 3 gate:** run one AI-generated batch through the review loop (edit and reject at least one item, approve the rest). See `ROADMAP.md`.

## 3. Known limits and debt (worth fixing)

**Shuffled choices**
- **The old-app window.** A battle is tagged as shuffled when it's created, so a player still on a cached older app (before the update toast) sees a different order than their review lists. It closes once the app updates. Practice, mocks, the Gauntlet and the placement test are tagged by the app that showed them, so they're unaffected.
- **Reviews rebuild the order from the live question.** If an admin changes a question's number of choices after a sitting, that sitting's review lists them in a different order than was shown (a battle uses its own snapshot, so only the count matters there). Storing the order per attempt would close this, at the cost of a column.

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
- **Rate limits:** 300 requests per signed-in learner per 15 minutes (`RATE_LIMIT_USER_MAX`), and a per-address flood guard of 3000 before sign-in (`RATE_LIMIT_GLOBAL_MAX`). Both are in memory, so with two backend instances each counts on its own (as with live battle rooms). One address signed in as several accounts can now send up to 3000 a window where it was 300; the only routes open without sign-in are `/api/config/tos` and the secret-guarded cron route, so that's accepted.

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
- ~~**Placement follow-up**~~ shipped: past 30 answers Today applies the floor rule to the forecast. Still open: a whole "where to start" card on Progress, not only Today's action.
- ~~**Formula ↔ question links**~~ shipped both ways. Still open: Today's loop could add a due card's topic questions on its own.
- ~~**Focus goals**~~ shipped as one weekly goal split by board weight. Still open: a reminder when a week is behind, and a per-subject goal the learner sets by hand.

**Battles**
- ~~Rematch, and a battle history with the per-question replay~~ shipped: Exams › Battles › Past battles, everyone's picks in a battle's review, and Rematch from the results, the review and the history. Spectate stays players-only; a screen for others needs an opt-in first.
- Ranked matchmaking by Elo (a queue rather than invite codes).

**Reach and polish** (left out of the last release by choice; still the next obvious set)
- An install prompt for the web app, data export (the notebook to PDF, answers to CSV), and an Admin switch for feature flags (`useFlag` already reads them).
- Web Push for browser users; a reminder minute, not just the hour; quiet days; a weekly summary push.
- iOS build (Capacitor), and Play Store signing.
- Search across notes; notes on topics as well as questions and cards; export the notebook to PDF.
- Offline: notes, mistakes and card reviews already paint from cache and queue writes. Practising a formula-card review offline works once the cards are cached.

## 5. Where the new code lives

**The learning-loop release**
- Rate limits: `ree-tracker-backend/src/middlewares/userRateLimit.js` (called from `authMiddleware`), the address limit in `server.js`.
- Where to start: `forecastPlan` in `ree-tracker/src/features/exams/startingPlan.js`, used by `features/today/{TodayPanel.jsx,todayActions.js}`.
- Cards ↔ questions: `ree-tracker/src/features/reference/{topicCards,useTopicCards,TopicCardsLink,practiseTopics,PractiseTopicsButton}`.
- Focus goal: `src/routes/focusRoutes.js` (`PUT /focus-goal`), `src/services/focusTime.js` (`week`), and `features/analytics/sections/{FocusGoal.jsx,weeklyGoal.js}`.

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

After pulling a change to `packages/shared`, restart Vite with `--force` (or delete `ree-tracker/node_modules/.vite`): Vite pre-bundles the CommonJS package once and doesn't notice its edits, so a new export reads as "is not a function" in dev. CI starts clean.

House rules:
- Migrations are additive only. Generate the SQL with `prisma migrate diff`.
- New per-user routes go under `/api/user/...`.
- Owner-scoped writes use `userId: req.user.id`.
- Update `FEATURES.md` in every commit that changes a feature (see `CLAUDE.md`).
