# Design: phone-first reorganization of the REE Tracker

Status: approved 2026-10-07. Delivered in four milestones (M1 navigation shell, Admin split and Account;
M2 Today and Progress; M3 Practice, Exams and Library; M4 wording sweep), each a stacked PR set deployed
and verified before the next.


## Context

Learning features are now strong (Waves 0–3 shipped: PRC forecast, SRS, CAT placement, Planner v2, a11y). Finding them is the problem. Three code reviews mapped the current information architecture and found these issues:

- **The Dashboard is about 11 stacked cards on a phone.**
  - Pass probability and projected average are shown twice.
  - Today's target appears three times.
  - "Next best actions" overlaps "Today's prescription".
  - Blind spots appear three times.
- **Profile is a junk drawer.**
  - It holds Comparative analytics, Deep analytics, the Planner, Credentials, an admin tool and Settings.
  - The exam date can be edited in three places. Daily target lives in a Dashboard "Config" button.
  - "Purge analytics" sits inside Daily targets.
  - There is no password reset anywhere.
- **"Module Library" is really the admin question bank.**
  - AI/PDF ingestion is not admin-gated.
  - "Add manually" dead-ends for learners.
  - "Vault" names four different things.
  - Study material is spread across Materials tabs, and Library and Materials aren't on the phone bar at all.
- **Arena says "leaderboards" but opens on battles.**
  - The Gauntlet hides inside it.
  - The simulator nav uses a confirm modal and is never highlighted.
  - Simulator results keep the red exam banner.
  - Gauntlet non-exam screens have no app chrome.
- **Practice has three overlapping ways to start a weak-spot drill.**
  - Smart drill silently ignores the chosen subject.
  - There is **no end-of-session summary**.
  - Bookmarks can't be practised.
- **Sci-fi jargon is everywhere** ("Global Matrix Ranking", "Active Network Agents", "Encrypted Items", "Anomaly Reported", "Apex Agent").

**Goal:** five clear destinations a learner can find on a phone, with every feature in the place they'd look, plus a single Account page and a separate Admin area. Shipped in four verified milestones.

**User decisions (2026-10-07):**
- Phone-first.
- Five task tabs: Today · Practice · Exams · Progress · Library.
- Battles, the Gauntlet and rankings live inside Exams.
- An Admin area that only admins see.
- Staged PRs, deployed per milestone.
- Plain, professional wording.
- Add Forgot password and Change password.
- Learner AI/PDF contribution removed (admin only; the server review gate stays).
- Gauntlet levels named Warm-up · Stretch · Full length · Pressure round.
- The phone avatar opens a small menu: Account · Admin · Log out.
- Defaults I chose:
  - Library opens on Formula cards.
  - `/arena` redirects to `/exams?tab=battles`.
  - The "Active Network Agents" online list is dropped.

## Target structure

| Destination (phone bar = sidebar) | What lives there | Built from |
|---|---|---|
| **Today** `/` | One next step (due review, then today's plan task, a fix, the target, a mock); pass chance headline; today's target with per-subject bars; exam countdown; streak; placement prompt | `TodayPanel`, `todayActions`, MissionControl's split, the planner task |
| **Practice** `/practice` | Due review · Weak spots · Quick 20 · Flashcards · **Bookmarks** · Build your own · **session summary** | `ActiveReview` / `ReviewSetup` / `useReviewSession` |
| **Exams** `/exams?tab=mock\|gauntlet\|battles\|rankings\|history` | Mock board (one subject / full board / mixed / custom), Gauntlet ladder, Battles, Rankings plus your rank, Past sittings | `SimulatorConfig` profiles, `Arena.jsx` split, `MockBoardAnalytics` |
| **Progress** `/progress?tab=overview\|topics\|weak-spots\|confidence\|habits\|plan` | Forecast, θ trend, KPIs, AI report · topic mastery heatmap · weak signals plus recommended fixes · calibration · calendar and study time · study plan | Dashboard analytics, `AnalyticsDeepDive` split, `ComparativeAnalyticsTab` dissolved, Planner |
| **Library** `/library?tab=formulas\|handouts\|bookmarks\|quizzes` | Formula cards, handouts (read-only), bookmarks (with "Practise"), imported quizzes | `Materials.jsx`, renamed |
| **Account** `/account` (avatar menu) | Exam plan (the **only** exam-date and daily-target editor), appearance, notifications, offline and sync, placement test, achievements, your data (reset/delete analytics), sign-in and security (reset or change password, log out, delete) | `Profile.jsx`, split up |
| **Admin** `/admin?tab=questions\|explanations\|references\|handouts` (admins only) | Question bank (AI/PDF ingestion, manual add, grid, review queue, syllabus), explanation review, reference-card admin, handout uploads | the old Library page, `ExplanationReview`, `ReferenceAdminV2`, `CloudVaultTab isAdmin` |

**Unchanged runner URLs:** `/simulator` (plus `?battleId=`, new `?profile=`), `/gauntlet/:level`, `/battle/:id` and `/diagnostic`. All of them light **Exams** in the nav, except `/diagnostic`, which lights Today.

**Legacy redirects** (`replace`, **forwarding `location.state`**):
- `/review` → `/practice` (old native reminders open `/review`, so this one must be permanent).
- `/arena` → `/exams?tab=battles`.
- `/profile` → `/account`.
- `/materials` → `/library?tab=…`, mapping cloud_vault→handouts, reference→formulas, bookmarks→bookmarks, quiz_launcher→quizzes, manage_ref→`/admin?tab=references`.
- `*` → `/`.

## Shared building blocks (M1)

- **`src/layouts/navModel.js`:** `PRIMARY_NAV`, `ACCOUNT_NAV`, `ADMIN_NAV` and `activeNavId(pathname)`, which compares the first path segment only. Pure data, the single source for the sidebar, bottom bar and active state. Add `CalendarCheck` and `ShieldCheck` to `components/ui/icons.js`.
- **`src/hooks/useTabParam.js`:** `?tab=` with a fallback; changes use `replace: true` so the phone back button doesn't walk through tabs.
- **`src/routes/LegacyRedirect.jsx` + `legacyRoutes.js`:** a redirect that forwards state, because a plain `<Navigate>` drops preset state.
- **`src/routes/AdminRoute.jsx`, plus `roleResolved` in `contexts/AuthContext.jsx`.**
  - `isAdmin` resolves only after the profile fetch, which can take seconds on a cold start.
  - States: pending shows "Checking access…"; a learner offline sees an empty state; a learner online is redirected to `/`. The server stays the real gate.
- **`src/hooks/useSignOut.js`:** extracted verbatim from `Profile.jsx`.
- **PageHeader:** move `components/PageHeader.jsx` to `components/ui/PageHeader.jsx` and export it. Every destination's h1 comes from it and matches its nav label.
- **Sticky offsets:** CSS variables `--sticky-top` and `--bottom-bar-h` on each layout root. Used by the `SimulatorActive` and Gauntlet toolbars and the `ReviewSetup` sticky bar.
- **Offline pack de-dupe:** `refreshOfflinePack()` in `services/dbQueries.js` shares one in-flight promise. Shell chrome is rendered per breakpoint, so `useOfflinePack` mounts once.
- **`launchPractice(navigate, preset)`** in `features/active-recall/presets.js` is the one entry point for every deep link that starts a session.

## M1: navigation shell, Admin split, Account

**Shell**
- `layouts/MainLayout.jsx` becomes a composition. It removes the drawer, `NAV_GROUPS`/`BOTTOM_NAV`, the simulator confirm modal and the sidebar-open store keys (`store/useStore.js`, `store/slices.js`). It keeps the skip link, `main#main-content` and the theme effect.
- New `layouts/Sidebar.jsx` (desktop):
  - nav, then the Admin link (admins only);
  - `OfflineStatusBadge` at the bottom;
  - the Account card;
  - the Pomodoro at the top, or a timer button when collapsed.
- New `layouts/PhoneHeader.jsx` (brand · Pomodoro sheet via `Modal` · compact offline badge linking to `/account#offline` · `AccountMenu`) and `layouts/BottomBar.jsx` (5 items, `aria-current`).
- New `layouts/AccountMenu.jsx`: a disclosure, not an ARIA menu, containing Account · Admin · Log out with a confirm. Escape closes it and returns focus; `touch-target`.
- The strictness warning moves to a line above Start in `SimulatorConfig`.

**Routing**
- `App.jsx` uses an `AppShell` layout route, so the bar stays visible while page chunks load.
- Deep-link call sites move to `launchPractice`, `/library?tab=` and `/exams?tab=`:
  - `pages/Dashboard.jsx:47,55,60,71,96`
  - `features/today/TodayPanel.jsx:178`
  - `features/analytics/AnalyticsDeepDive.jsx:130,133`
  - `features/analytics/WeakSignalsPanel.jsx:24,82`
  - `features/profile/StrategicPlannerTab.jsx:17`
  - `pages/Diagnostic.jsx:223`
  - `pages/BattleLobby.jsx:49,76`
  - `pages/Gauntlet.jsx:76,89,150`
  - `features/gauntlet/useGauntletEngine.js:145,159`
  - `features/gauntlet/GauntletDiagnostics.jsx:95`
- `services/localReminders.js:73` changes to `/practice`. `components/NotificationOptIn.jsx` changes "Settings" to "Account".

**Interim destinations** (final URLs now; content gets replaced in M2/M3)
- **Today:** the Dashboard with h1 "Today".
  - The purge modal is removed.
  - `MissionControl`'s Config editor is removed; its "Edit" button links to `/account#exam-plan`.
- **Practice:** `/practice` renders `ActiveReview`, with h1 "Practice".
- **Exams:** new `pages/Exams.jsx`.
  - Mock board tab: new `features/exams/MockBoardTab.jsx`, using a new `features/board-simulator/profiles.js` shared with `SimulatorConfig`. Its "Set up" goes to `/simulator?profile=` (applied with a lazy `useState` initializer, not an effect).
  - Other tabs: a lazy `Arena.jsx` taking a controlled `tab` prop.
- **Progress:** interim `pages/Progress.jsx` with Analytics (AnalyticsDeepDive), Rankings & streak and Plan.
  - `StudyPlanGenerator` loses its exam-date input. It shows the date with a "Change" link to Account and uses `stats.examDate`.
- **Library:** `git mv pages/Materials.jsx pages/Library.jsx` (after the next item).
  - Tabs are formulas/handouts/bookmarks/quizzes; handouts are read-only.
  - It accepts `location.state.{search,kind}`.
  - The viewer is extracted to `features/materials/MaterialViewer.jsx`.

**Admin**
- `git mv pages/Library.jsx pages/admin/QuestionBank.jsx` first, reusing `LibraryIngestion`, `LibraryOverview`, `ManualIngestionForm` and `VaultDataGrid` unchanged.
- New `pages/admin/Admin.jsx`, with lazy tabs and wrapped in `AdminRoute`:
  - questions → `QuestionBank`
  - explanations → `ExplanationReview`
  - references → `ReferenceAdminV2`
  - handouts → `CloudVaultTab isAdmin` + `MaterialViewer`
- Learners never download the Admin chunk.

**Account:** new `pages/Account.jsx`, one scrolling page with anchors.

| Section | Component |
|---|---|
| `#exam-plan` | `features/account/ExamPlanForm.jsx`: exam date and daily target (10–500) via `saveExamConfig`; days left via `daysToExam` (Manila); split via `apportionItems`; reset with `key`, never a prop→state effect |
| Appearance | `ThemingArchitecture` |
| `#notifications` | `NotificationSettings.jsx`, moved from Profile |
| `#offline` | `OfflineSyncSettings.jsx`: badge, cloud backup, restore |
| Placement test | link to `/diagnostic` |
| `#achievements` | `CredentialsTab` + `Milestones.jsx`, moved from ComparativeAnalyticsTab |
| `#data` | `DataSettings.jsx`: Reset today and Delete all analytics, each behind a confirm |
| `#security` | `SecuritySettings.jsx`: **Send password reset email** (`sendPasswordResetEmail`), **Change password** (re-auth + `updatePassword`), Log out, Delete account |

- Login gets a **"Forgot password?"** link (`pages/Login.jsx`) that sends a reset email.
- Delete `pages/Profile.jsx`, including the dead task-due notification effect.

**M1 tests**
- **Rewrite the drawer block of `layouts/touchAndOverlays.test.jsx`:**
  - the bar has exactly 5 links;
  - `aria-current` is correct on `/`, `/practice` and `/simulator` (which lights Exams);
  - Account menu focus and Escape behave;
  - the Admin link appears only for admins;
  - the desktop sidebar renders.
- **Update mocks** in `landmarks.test.jsx` (`useAuth` gains `roleResolved` and `logout`).
- **New tests:** `navModel.test.js`, `LegacyRedirect.test.jsx` (state forwarded, materials tab mapping), `useTabParam.test.jsx`, `AdminRoute.test.jsx` (pending / learner online / learner offline / admin), `ExamPlanForm.test.jsx`, `DataSettings.test.jsx`, and Login forgot-password.
- **Update:** `AuthContext.test.jsx` (`roleResolved`), `TodayPanel.test.jsx` and `WeakSignalsPanel.test.jsx` (new paths).

## M2: Today and Progress

- **`hooks/useDashboardStats.js`:** extracted from `Dashboard.jsx:99-187` (sync, readiness, the synced→refetch trigger, TOS re-bucketing, KPIs). Its set-state-in-effect moves once.
- **Today:** `git mv pages/Dashboard.jsx pages/Today.jsx`.
  - Keeps: the countdown and streak chips (using `daysToExam`) and `TodayPanel`.
  - TargetBlock gains MissionControl's per-subject bars. MissionControl is deleted, and the header sync pill is removed.
  - New `features/today/usePlanToday.js` plus `fetchPlannerTasks()` in `services/dbQueries.js`.
  - `buildTodayActions` priority: srs → plan → fix → target → mock, de-duplicating a same-topic plan task and fix, with at most 4 actions.
  - New `TodaySkeleton`.
- **Progress:** tabs, each lazy-loaded so recharts stays out of the page chunk.
  - **Overview:** KPIs, `ThetaVelocityChart`, `TrajectoryCard`, and `features/progress/AiBoardReport.jsx` (moved from Dashboard).
  - **Topics:** `HeatmapChart` (tiles call `launchPractice`) + Subject accuracy.
  - **Weak spots:** drill buttons + `WeakSignalsPanel` + `PrescriptionPanel` titled "Recommended fixes". Its routing moves to `features/progress/prescriptionRouting.js`.
  - **Confidence:** `ConfidenceMatrix` + `CalibrationCurve` + calibration cards.
  - **Habits:** `ActivityCalendar` + study time + time per topic + streak.
  - **Plan:** `StrategicPlannerTab`.
- **Split `AnalyticsDeepDive.jsx`:**
  - `features/analytics/useDeepAnalytics.js` + `features/analytics/sections/*`, with Card h2 headings and no emoji.
  - Drop "Score history" (it duplicates Past sittings), then delete the file.
- **Dissolve `ComparativeAnalyticsTab`:**
  - `features/exams/YourRankCard.jsx` goes into Rankings.
  - The calendar goes to Habits; the streak goes to the Today chip; the lifetime count goes to Past sittings.
  - The online list is dropped.
- **Exams:** add a **Past sittings** tab (lazy `MockBoardAnalytics`) now, so nothing goes missing between deploys.
- **Tests:**
  - New: `useDashboardStats`, `useDeepAnalytics`, `Progress.test.jsx` (fallback tab, each tab renders) and `Today.test.jsx` (h1 "Today", no KPI or prescription panels).
  - Extend `todayActions.test.js` (plan ordering, de-dup, Manila "today").
  - Delete the tests of deleted components.

## M3: Practice, Exams, Library

**Practice:** `git mv pages/ActiveReview.jsx pages/Practice.jsx` (and its hotkeys test).
- **ReviewSetup presets:** Quick 20 · **Weak spots** (smart drill: the single learner entry for it) · Flashcards 20 · **Bookmarks (N)**.
- **Custom session:** Mode · Focus · Scope (all / one subject / one topic) · Length · Source (Question bank / My bookmarks / AI).
  - Removes the `bleeding` scope and the Smart-drill source.
  - A leftover drill config is shown as Question bank.
  - `useReviewSession` keeps supporting `smart-drill` for deep links.
- **Bookmarks source:** `bookmarksPreset()`, and a `source: 'bookmarks'` branch in `useReviewSession.startSession` using `fetchBookmarks({limit:100})`.
  - The existing API returns full questions; add a `limit` param.
  - Filter by subject, use `stratifiedSample`, seed the bookmark set, and show an offline message. No backend change.
- **Session summary:**
  - Pure `features/active-recall/sessionSummary.js` `buildSessionSummary()` returns total/accuracy/time, a by-topic list sorted by misses, confident misses, lucky guesses and the missed items.
  - It is built in `endSession` **before** the batch is cleared and stored as `lastSummary`.
  - `SessionSummary.jsx` actions: Practise again · Drill weakest topic · See progress (`/progress?tab=topics`) · Done.
  - Nothing is shown after zero answers.

**Exams:** split `pages/Arena.jsx` (689 lines) into `features/exams/BattlesTab.jsx`, `HostBattleModal.jsx` (modes from `profiles.js`), `GauntletTab.jsx` + pure `gauntletTierState.js`, and `RankingsTab.jsx` (+ `YourRankCard`). Then delete `Arena.jsx`.
- **Simulator results leave ExamLayout:** change `BoardSimulator.jsx` (~186) to `inExamMode = isActive && !isFinished && !showBoardBreak`, and scroll to top on the switch. Sockets are unaffected.
- **`SimulatorDiagnostics` exits** go to `/exams?tab=history` ("Back to Exams").
- **Gauntlet:** the loading, resume, pending, error and diagnostics states render inside `MainLayout`; only the running exam uses `ExamLayout`.

**Library:**
- Tab subtitles.
- Bookmarks get "Practise bookmarks (N)" (via `launchPractice`). Remove 🔐 and "Encrypted".
- The Cloud Vault heading becomes "Handouts", with a quiet subtitle in place of the read-only banner.

**Tests**
- New: `sessionSummary.test.js`, `SessionSummary.test.jsx`, `useReviewSession.bookmarks.test.js`, `Exams.test.jsx`, `gauntletTierState.test.js`, `Library.test.jsx`.
- Rewrite the "weak points scope" block of `ReviewSetup.srs.test.jsx`.
- Extend `BoardSimulator.fullBoard.test.jsx`: finished renders in main, active renders in exam.
- `Gauntlet.test.jsx`: mock `MainLayout`; chrome on non-exam screens.

## M4: wording sweep (plain and professional)

**Glossary**

| New term | Replaces |
|---|---|
| Today / Practice / Exams / Progress / Library / Account / Admin | — |
| Practice session · Due review · Weak-spot drill · Blind-spot drill | — |
| Mock board · Full board · Past sittings · Mock score trend | Simulation ledger, Pre-board trajectory |
| Custom mock · One subject (PRC clock) · Mixed paper · Full PRC board | Custom Drill / PRC Standard / Full Blended |
| Gauntlet: **Warm-up · Stretch · Full length · Pressure round** (+ subject boards) | `config/examStandards.js` tier names |
| Battles · Host/Join a battle · Rankings · Your rank | Combat Terminal, Global Matrix |
| Formula cards · Handouts · Bookmarks · Imported quizzes | Reference Cards, Cloud Vault, Bookmark Vault, Quiz Launcher |
| Study calendar · Milestones · Readiness certificate | Consistency Matrix, Operational Milestones, Certificate of Operational Readiness |
| Saving… / Saved / Waiting to sync · "Thanks — we'll review this question." · "AI explanation unavailable right now." | Telemetry/Encrypting/Anomaly/AI Core |
| Plan | Objectives |

**Strings to replace** (full list in the design spec):
- Arena/RankingsTab "Global Matrix".
- `ActivityCalendar`, `CredentialsTab` + `utils/certificateEngine.js` ("Pressure Chamber").
- `BookmarkVaultTab`, `CloudVaultTab` ("Uplinking…matrix"), `MediaViewer` ("Audio Playback Matrix").
- `ThemingArchitecture` ("Deep Space Matrix"), `StrategicPlannerTab` ("Objectives").
- The engines: `useReviewSession`, `useSimulatorEngine`, `useGauntletEngine`, `SimulatorActive`, `GauntletDiagnostics`.
- `QuizFilePicker` ("your Dashboard").
- The admin hooks: `useManualIngestion` "into the Matrix", `useAIIngestion`, `useVaultGrid`.
- Emoji toast icons → lucide or none.

**Fallback display name:** `fallbackDisplayName(uid)` → `Reviewer-xxxxxx`, added to `packages/shared`.
- Use it in `src/services/dbQueries.js:418`, Account, and backend `routes/leaderboardRoutes.js:25`, `routes/userRoutes.js:14`, `sockets/battleSocket.js:109`.
- Existing database rows are left as they are.
- Keep "REE.ai Core": `e2e/login.spec.ts` asserts it.

**Tests**
- New `src/test/copyGuard.test.js` scans source for the **exact banned phrases**: Global Matrix, Operational Milestones, Encrypted, Decrypting, Security Breach, Anomaly reported, AI Core, Combat Terminal, Assessment Core, Uplinking, `Agent-`, Initiate Protocol, Apex Agent.
- Fix the copy-coupled tests by updating their assertions: `TodayPanel`, `ReviewSetup.srs`, `SimulatorDiagnostics`, `BoardSimulator.fullBoard`, `Gauntlet`, `MockBoardAnalytics`, `QuestionCard`, `Diagnostic`, `PlacementPrompt` and `e2e/login.spec.ts`.
- Run the backend suite.

## Process for every milestone

1. **Branch setup.** Fetch and branch from the latest `origin/main`. In the worktree run `npm ci`, then check that `require.resolve('@ree/shared')` resolves inside the worktree (stale `node_modules` memory).
2. **Design spec in M1.** Write the design to `docs/superpowers/specs/2026-10-07-ia-reorganization-design.md`, including the full string list.
3. **Small reviewable PRs, chained into one linear stack per milestone.** For M1: (a) building blocks + routes + redirects, (b) shell, (c) Admin, (d) Account + password.
   - Each PR updates FEATURES.md, as CLAUDE.md requires.
   - Use `git mv` to move files. Extract code once and never copy it, so lint-ratchet counts stay flat.
4. **Checks:**
   - `npm run test` (frontend; backend in M4)
   - `npm run lint:ratchet`, then `-- --update` if counts dropped
   - `VITE_BACKEND_URL=http://localhost:5000 npm run build`
   - `npm run check:bundle`: record the total. It is about 89% of 700 kB now. The shell must import only `layouts/*`, `routes/*`, hooks and primitives, and everything new is lazy; no `manualChunks` changes.
   - `npm run check:sw`: it only tests the API matcher, so it should pass untouched.
   - `npm run e2e -- --project=mobile` and `--project=chromium`
5. **Browser checks at 375×812 and on desktop, on the dev server, signed in.** You sign in in the pane: a learner account, and your admin account for the Admin checks.
   - **M1:**
     - Bar highlighting on `/`, `/practice`, `/exams`, `/simulator`, `/battle/x` and `/progress`; no bar during a running `/gauntlet/1`.
     - Avatar menu works by keyboard.
     - Admin is hidden for a learner. Opening `/admin` cold as admin shows "Checking access…" and then the page.
     - A Today action auto-starts Practice.
     - `/review`, `/materials`, `/profile` and `/arena` redirect.
     - Account saves the exam date and target; Reset today and Delete analytics ask to confirm.
     - The offline pack downloads once.
     - The Pomodoro sheet works, and the floating pill sits clear of the bar.
   - **M2:**
     - Today is one card with the plan task and no layout jump.
     - Every Progress `?tab=` survives a reload.
     - Past sittings shows the ledger.
   - **M3:**
     - Finished mock results show no red banner, and the toolbar isn't under the header.
     - A two-account battle end to end.
     - Gauntlet screens have the app chrome.
     - A summary appears after 3 answers and nothing after 0.
     - A bookmarks session runs.
     - A formula deep link opens with the search pre-filled.
   - **All milestones:** axe DevTools on every new page: one h1, no heading-level skips, no contrast failures.
6. **Ship.** With your merge approval each time: merge the stack top-down, wait for CI on the bottom PR, merge to main (one deploy), then verify live with a deep-link and console check.

## Risks and mitigations
- **Lost preset state:** `LegacyRedirect` and `launchPractice`, both with tests.
- **Admins bounced from `/admin`:** `roleResolved` plus the pending state.
- **Battle flow:** the URLs are unchanged and the socket hook stays mounted across the layout switch; a two-account test in M3.
- **Sticky collisions:** CSS variables.
- **Double pack download:** chrome rendered per breakpoint plus the in-flight de-dupe.
- **Boot budget:** lazy pages and a shell-only import policy.
- **Lint ratchet:** move with `git mv` and key-reset forms.
- **Silently dropped features:** each is listed in FEATURES.md: the simulator confirm modal, the online list, the Score history tab (merged), learner AI ingestion, the dead task notification.
