# REE Tracker — Feature Register

Single source of truth for what the app can actually do today. Generated from a direct scan of
`ree-tracker/src/{features,pages}`, `ree-tracker-backend/src/{routes,engine,services}`, and
`ree-tracker-backend/src/sockets`. Maintained per the rule in [CLAUDE.md](CLAUDE.md) — updated on
every feature add, change, or removal, not on a schedule.

---

## Exam & Practice Modes

- [x] **Active Review** — per-question reveal MCQ practice with SRS-driven interleaving (`pages/ActiveReview.jsx`, `features/active-recall/{FlashcardMode,MCQMode,ReviewSetup,useReviewSession}.jsx`)
- [x] **PRC board verdict** — one definition of pass/fail, shared by the results screen, exam history and the pass-rate KPI: a 70% general average AND no rated subject below 50%. Subjects an exam never asked about stay unrated rather than counting as zero. Previously five copies with two different thresholds, so a 55% mock showed FAILED on screen and CONDITIONAL PASS in history (`@ree/shared` verdict rule)
- [x] **Board Simulator** — full timed mock exam: config → live run → post-exam diagnostics, exportable exam paper PDF. Crash-safe: the resumable draft carries answers, confidences, bookmarks, current item **and per-question timing**, is retained through resume, and is cleared only once the attempts are durably synced or queued — a failed submit of any kind (5xx, auth, parse error) defers the batch to the offline outbox instead of discarding it (`pages/BoardSimulator.jsx`, `features/board-simulator/{SimulatorConfig,SimulatorActive,SimulatorDiagnostics,useSimulatorEngine,examPaper,battleGrades}.jsx`)
- [x] **Gauntlet** — distraction-free timed drill with resume-from-cache and its own diagnostics (`pages/Gauntlet.jsx`, `features/gauntlet/{useGauntletEngine,GauntletDiagnostics}.jsx`)
- [x] **Shared answer surface** — one `QuestionCard` component (prompt, confidence selector, choice grid, hotkeys, reveal animation) reused identically across Active Review, Board Simulator, Gauntlet, Combat, and the offline Quiz Launcher (`features/quiz/QuestionCard.jsx`)
- [x] **Exam-focus layout** — collapsible high-alert header, distraction-free chrome for any active exam surface (`layouts/ExamLayout.jsx`)
- [x] **Offline CAQ Quiz Launcher** — import a third-party `.quiz`/`.caq` archive (ZIP) from the user's device and run it as an untimed practice exam entirely client-side: zero server contact, zero telemetry, zero effect on θ/streak/analytics. Parses to a normalized shape, skip-and-counts malformed records rather than failing the file, and collapses byte-identical duplicate answer choices (a real defect observed in third-party files) so the question stays answerable. Statically verified to never import the telemetry/store/scoring modules (`features/quiz-launcher/{caqParser,useCaqSession,QuizFilePicker,QuizLauncherTab,CaqRunner,CaqResults}.js(x)`, entry point: Materials Hub → Quiz Launcher tab, lazy-loaded)

## Analytics & Forecasting

- [x] **Dashboard** — readiness score, KPI strip, daily targets, ability trajectory chart (`pages/Dashboard.jsx`)
- [x] **Deep analytics dive** — per-subject/topic breakdown, speed mapping, confidence-vs-accuracy matrix (`features/analytics/AnalyticsDeepDive.jsx`, backend `analyticsDeepRoutes.js`)
- [x] **Calibration curve** — confidence-vs-actual-accuracy visualization (`features/analytics/CalibrationCurve.jsx`, `calibration.js`)
- [x] **Exam performance card** + **prescription panel** — post-exam summary and "3 actions to close your widest gaps" recommender (`features/analytics/{ExamPerformanceCard,PrescriptionPanel}.jsx`)
- [x] **Ability trajectory (θ) chart** — readiness velocity over day/week/month (`features/analytics/TrajectoryCard.jsx`, `components/ThetaVelocityChart.jsx`)
- [x] **Explanation review** — AI-explanation audit queue for flagged/pending items (`features/analytics/ExplanationReview.jsx`)
- [x] **Consistency matrix / activity calendar** — Manila-day heatmap of questions answered (`features/profile/ActivityCalendar.jsx`, backend `analyticsRoutes.js`)
- [x] **Comparative analytics** — peer percentile, online-agents list, milestones (`features/profile/ComparativeAnalyticsTab.jsx`)
- [x] **Readiness snapshots** — cached pass/topnotcher probability + weak-topic ranking (`readinessRoutes.js`, `services/readinessCache.js`)
- [x] **Forecast engine API** — exposes `engine/forecast.js` pass-probability model (`forecastRoutes.js`)

## Adaptive Engine (backend, `ree-tracker-backend/src/engine/`)

- [x] **Item Response Theory (3PL)** — stateless per-item ability estimator, single unified θ + standard error per user (`engine/irt.js`)
- [x] **Bayesian Knowledge Tracing (BKT)** — per-topic P(mastery) driving the topic mastery heatmap, complementary to θ (`engine/bkt.js`)
- [x] **Elo rating** — multi-player adapted rating for Arena leaderboards and Battle outcomes (`engine/elo.js`)
- [x] **Readiness score** — composite of topic coverage, accuracy, θ, consistency and blind spots, with the scoring rule extracted into a pure, unit-tested service (weights, θ normalisation derived from the estimator's own bounds, blind-spot definition and clamps) rather than inline in a route handler (`services/readinessService.js`, `readinessRoutes.js`)
- [x] **Forecasting model** — turns θ into pass/topnotcher probability + ranked weak topics, drawn from per-topic performance so the prescription names real subtopics instead of the three subject buckets (`engine/forecast.js`, `forecastRoutes.js`)
- [x] **Shared numerics** — dependency-free math helpers backing the above (`engine/math.js`)
- [x] **Nightly/on-demand calibration** — recalibrates item difficulty parameters from live attempt data. Reads the response matrix by keyset pagination rather than loading every attempt into memory, and writes item parameters and abilities in transactional chunks so a crash cannot leave half the bank calibrated (`services/calibrationService.js`, `npm run calibrate`)
- [x] **Smart Drill** — adaptive next-question selection targeting weak topics (`smartDrillRoutes.js`, `services/questionPool.js`)
- [x] **Spaced repetition (SRS)** — per-card scheduling for Active Review (`srsRoutes.js`)

## Vault & Reference Hub (Materials Hub)

- [x] **Cloud Vault** — folder-structured material upload/organize/rename/move/delete, direct Firebase media storage (`features/materials/{CloudVaultTab,useFileManager}.jsx`, `materialRoutes.js`)
- [x] **Reference Cards** — taxonomy-driven interactive flashcard vault (constants/formulas/concepts), Subject→Topic→Subtopic drill-down, subject-level and subtopic-level "Study this set" sessions, pure-CSS 3D flip, full LaTeX rendering across every field including description/board-exam-tip/variable-meaning (`features/reference/{ReferenceBrowser,Flashcard,ReferenceStudyMode,useReferenceCards}.jsx`, `referenceCardRoutes.js`)
- [x] **Reference admin** — create/edit/AI-generate/approve reference cards with required-field validation; Live Cards panel has real-time search (name/symbol/subtopic/description) and 6-way sort (A-Z, Subject, Subtopic, Recently added, Card type, Needs attention) (`features/reference/ReferenceAdminV2.jsx`)
- [x] **Bookmark Vault** — save any question for later, review with AI explanation on demand (`features/vault/BookmarkVaultTab.jsx`, `bookmarkRoutes.js`)
- [x] **Question Library / admin review queue** — AI-generated question ingestion (PDF/image), manual authoring, vault data grid (`pages/Library.jsx`, `features/library/*`, `reviewRoutes.js`, `questionRoutes.js`)
- [x] **Accept-All batch approval** — confirmation-gated bulk approve, chunked client-side with a dedicated non-dismissable progress modal ("batch N of M"); server collapses each chunk's question-create + status-update + audit-row writes into one transaction instead of per-item sequential round-trips; 409 (in-flight duplicate) and thrown-error chunks reconcile against the server automatically within the same run rather than requiring a manual retry (`features/library/LibraryOverview.jsx`, `services/reviewService.approveBulk`)

## Content Pipeline

- [x] **AI question generation** — Gemini-backed generation from syllabus targets or uploaded material, with strict JSON/LaTeX rules (`aiRoutes.js`, `services/geminiApi.js` client-side)
- [x] **AI reference card generation** — same pipeline for constants/formulas/concepts
- [x] **PDF/image ingestion** — OCR-adjacent text extraction feeding AI generation (`features/library/pdfWorker.js`)
- [x] **LaTeX rendering** — KaTeX via remark-math/rehype-katex, with a math-delimiter normalizer at ingestion so malformed LaTeX doesn't reach the database (`components/LatexRenderer.jsx`, `utils/mathDelimiters.js`)
- [x] **Taxonomy resolver** — shared Subject/Topic/Subtopic hierarchy backing questions, reference cards, and the heatmap (`topicResolver.js`)
- [x] **PRC syllabus weighting** — dynamic Table-of-Specification weights per subject, canonically keyed and sourced from the shared package so the client's weighted rating and the server's blended sampler cannot diverge (`utils/tosWeights.js`, `SyllabusWeight` model, `@ree/shared`)
- [x] **Shared rules package (`@ree/shared`)** — npm workspace holding every business rule that must agree between client and API: the board verdict, subject naming, syllabus weights, Manila day bucketing, LaTeX/choice-prefix normalisation, and analytics thresholds. Cross-package contract tests assert the same facts from both sides, so a drift or a broken link fails CI (`packages/shared`, `src/test/sharedContract.test.js`, `tests/sharedContract.test.js`)

## Multiplayer & Social

- [x] **Arena** — global peer leaderboard, served from a periodically rebuilt snapshot. The rebuild is single-flight (concurrent stale requests share one pass instead of each launching a full table aggregate), demand-gated so an idle instance stops re-scanning, and escalates repeated failures instead of silently falling back forever (`pages/Arena.jsx`, `leaderboardRoutes.js`, `services/leaderboardService.js`)
- [x] **Battle (real-time multiplayer)** — Socket.IO-backed lobby, live opponent state, server-authoritative grading and scoring. Every event is rate-limited per socket; `battle-submit` only ever reads an existing lobby (so a flood of forged ids cannot evict live battles) and requires the battle to be `IN_PROGRESS`; the battle start time is persisted, so a restart mid-match no longer zeroes every participant's elapsed time and randomises Elo placement (`pages/BattleLobby.jsx`, `battleRoutes.js`, `sockets/battleSocket.js`)
- [x] **Combat mode** — multiplayer answer surface sharing `QuestionCard`

## Platform & Offline

- [x] **Offline-first sync** — Zustand store with IndexedDB persistence, optimistic local writes reconciled against server-authoritative totals. Account-scoped: the persisted queue records its owning user, `resetStore()` wipes all local state on logout/account deletion, and a queue whose owner does not match the signed-in user is quarantined to dead letters rather than flushed under the wrong identity (`store/useStore.js`, `store/slices.js`, `services/analyticsSync.js`)
- [x] **Offline write outbox** — queued mutations (materials, telemetry) flushed on reconnect, with a synchronous localStorage mirror for fast tab-close that is cleared once the queue drains (`hooks/useSyncLifecycle.js`)
- [x] **PWA** — installable, service-worker precache (`vite-plugin-pwa`)
- [x] **Native shell (Capacitor)** — Android build target, local + push notifications (`@capacitor/{core,android,local-notifications,push-notifications}`)
- [x] **Firebase Auth** — session management with stalled-reconnect handling (`contexts/AuthContext.jsx`)
- [x] **Security headers & transport** — `helmet` with a restrictive CSP, HSTS in production, no-referrer, and nosniff; `/uploads` is served as a sandboxed forced-download so an uploaded document can never execute on the API origin; the server refuses to start in production without `FRONTEND_URL` rather than falling back to an open credentialed CORS policy; database TLS certificate verification is enabled whenever a CA is configured (`server.js`, `config/db.js`)
- [x] **Schema migration history** — a real baseline migration under `prisma/migrations/`, so schema changes are reviewable SQL rather than an invisible `db push` against production on every deploy; the cutover is documented as a deliberate operator step (`prisma/migrations/README.md`, `npm run migrate:*`)
- [x] **Build-time configuration guard** — a production build without `VITE_BACKEND_URL` fails loudly instead of inlining `localhost:5000` and shipping an app that cannot reach its API (`vite.config.js`)
- [x] **Route-level API tests** — supertest suites that prove the authorization rules negatively (a non-admin is refused), alongside service-level tests pinning the single-transaction write path and session ownership (`tests/questionRoutes.authz.test.js`, `tests/telemetrySessionOwnership.test.js`)
- [x] **Standing CI guards** — every PR runs a SQL-interpolation check plus a route guard that verifies both authentication *and* authorization: any write to a resource named by a path parameter must be owner-scoped, role-gated, or explicitly justified (`scripts/audit-route-auth.js`, `scripts/audit-sql-interpolation.js`)
- [x] **Admin controls** — role-gated question/reference approval, user management. Admin status derives solely from the server's `User.role`: one consolidated gate (`middlewares/roleMiddleware.js`, bounded 60s cache), no client-side email allowlist, and `isAdmin` is not persisted to IndexedDB. A failed role lookup fails closed (`adminRoutes.js`, `userRoutes.js`, `contexts/AuthContext.jsx`)
- [x] **Contribution review gate** — `POST /api/questions` routes every non-admin submission into the pending-review queue; only an admin can write the live shared question bank directly, and the answer-key-bearing edit paths are admin-gated and audited via `QuestionVersion` (`questionRoutes.js`)
- [x] **Community question flags** — reporting an anomaly writes a per-user `QuestionFlag` row (unique per user+question); the shared `isFlagged` quarantine bit flips only at a threshold of distinct reporters or on an admin flag, so no single account can empty the question pool (`questionRoutes.js`)
- [x] **Strategic planner** — task/milestone planning tied to the exam countdown. "Regenerate plan" now actually clears the previous plan (the clear route was permanently shadowed by `/tasks/:id` and always 404'd, so regeneration silently appended duplicates), and plan generation is validated and horizon-bounded (`features/profile/StrategicPlannerTab.jsx`, `plannerRoutes.js`)
- [x] **Study Plan Generator** — AI-assisted study schedule from readiness data (`features/study-plan/StudyPlanGenerator.jsx`)
- [x] **Boot sequence & brand identity** — branded loading screen with rotating tips, animated brand mark, replacing a plain spinner (`components/{BootSequence,BrandMark}.jsx`)
- [x] **Durable idempotency** — Idempotency-Key records live in Postgres (`IdempotencyRecord`), where the unique insert *is* the lock: concurrent duplicates race to insert, exactly one wins, and completed responses replay for 24h across restarts and deploys. Fails open if the store is unavailable (`middlewares/idempotency.js`)
- [x] **Idempotency + circuit breaker** — content-hash idempotency keys and outbox-safe retry on the telemetry write path; the telemetry flush runs through the shared API client, so it inherits the request timeout, the circuit breaker and offline-vs-error classification, and its idempotency key is derived from a **persisted** session id so a retry after a restart still replays instead of double-writing (`telemetryHelpers.js`, `services/telemetryService.js`, `services/dbQueries.js`)
- [x] **Transactional attempt recording** — attempts, activity ledger, topic rollups, BKT mastery, θ/standard error and the daily streak commit as a single transaction per chunk under a `SELECT … FOR UPDATE` row lock, chunked so a large offline flush cannot exceed the transaction budget. Taxonomy resolution is hoisted out of the transaction to keep the connection pool acyclic, and client-supplied durations are clamped at ingest so one malformed value cannot reject an entire batch (`services/telemetryService.js`, `config/telemetryBounds.js`, `config/db.js`)
