# Orchestrated roadmap prompt: REE Tracker phased enhancement

Paste this whole document as the master task brief for an agent (or for yourself) driving REE Tracker through its next five phases. It assumes `OFFLINE_MODE_IMPLEMENTATION_PROMPT.md` and `REE_TRACKER_FULL_AUDIT_PROMPT.md` exist alongside this one — Phase 1 delegates to the former, and the audit prompt should be re-run at each phase gate. This document's job is orchestration and technical depth for the phases those two didn't fully cover.

---

## 1. Context

REE Tracker: React + Vite + Zustand frontend, Express + Prisma + Supabase Postgres backend, Firebase Auth, Gemini for AI content generation. `VariaresDree/ree-tracker-fullstack`, solo-maintained. Prior audits closed the critical security/correctness gaps (auto-admin bug, SQL injection, exposed keys, broken IRT engine). This roadmap covers what comes next, in dependency order — each phase assumes the previous one's gate has been passed, not just started.

## 2. Orchestration principle

**Do not parallelize phases.** Each phase changes the ground the next phase builds on — Phase 2 (UX) should be built against the final offline-aware data flow from Phase 1, not redone after the fact; Phase 4 (competitive/real-time) needs Phase 3's scoring integrity to be trustworthy before anything gets a leaderboard attached to it. If time pressure forces overlap, only ever overlap adjacent phases, never skip one.

Every phase ends with an explicit **gate** (Section 8-style checklist). Do not begin the next phase until the gate is passed. This is deliberate friction for a solo maintainer — it's cheaper to stop and verify than to discover in Phase 4 that Phase 1's sync logic was silently dropping records.

## 3. Phase 0 — Foundation verification (should be fast; this is a re-check, not new work)

- Re-run `REE_TRACKER_FULL_AUDIT_PROMPT.md` Section 4.4 (secure architecture) specifically, to confirm no regressions since the last audit.
- Add a standing CI check, not a one-time fix: a lint/grep script (`scripts/audit-sql-interpolation.js`) that fails the build on any template-literal string passed into a raw Prisma/`pg` query call — this converts the SQL injection fix from "found once" into "cannot regress silently."
- Add an equivalent standing check for route auth coverage: a script that diffs the route table against `authMiddleware` usage and fails CI if a new route is added without it.
- Unit-test the IRT engine's math directly against known reference values (e.g. a 2PL model with hand-computed probabilities for a few theta/difficulty pairs) — not just "does it run," but "does it compute the number a psychometrics textbook would produce."

**Gate:** CI has two new standing checks (SQL interpolation, route auth coverage) that fail on violation, and the IRT engine has unit tests passing against hand-verified reference values.

## 4. Phase 1 — Offline-first core

Execute `OFFLINE_MODE_IMPLEMENTATION_PROMPT.md` in full. Technical additions beyond what that document specifies:

- **Dexie schema versioning:** define the schema with explicit `.version(1).stores({...})` and plan `.version(2).stores({...}).upgrade(...)` migrations from day one, even though v1 is the only version that exists now — retrofitting Dexie migrations later on live user data is materially harder than starting with the pattern in place.
- **Outbox retry backoff:** use a capped exponential backoff (e.g. `min(2^retryCount * 1000ms, 60000ms)`) rather than fixed-interval retry, so a flaky connection doesn't hammer `/telemetry-bulk` every 30 seconds indefinitely.
- **Content pack delta strategy:** version packs by content hash, not just an incrementing integer, so a re-authored question triggers a delta re-download of only the changed items rather than the whole subject.
- **Service worker caching strategy per resource type**, explicit in the Workbox config:
  - App shell (JS/CSS): precache, `CacheFirst` with revision-based invalidation.
  - Question pack JSON: `NetworkFirst` with a short timeout, falling back to cache — content should feel live when online but degrade gracefully.
  - Images: `CacheFirst` with a max entries / max age expiration policy so the cache doesn't grow unbounded on a device with limited storage.

**Gate:** the offline-mode Definition of Done checklist from `OFFLINE_MODE_IMPLEMENTATION_PROMPT.md` Section 12 is fully checked, plus: Dexie migration path is documented even for v1→v2 hypothetically, and Workbox strategies are explicit per resource type (not a single blanket strategy).

## 5. Phase 2 — UX and accessibility

- **Design tokens as a real artifact**, not scattered Tailwind classes: a `tokens.css` (or Tailwind theme extension) defining the color, spacing, and type scale once, consumed everywhere. Audit every screen for hardcoded hex values or arbitrary spacing (`mt-[13px]`) and replace with token references — this is what actually prevents the "each screen evolved its own style" drift the audit prompt is designed to catch.
- **Componentize shared primitives:** a single `Button`, `Card`, `Modal`, `ProgressIndicator` etc. with defined variants, used everywhere instead of ad hoc markup per screen. This is both a UX-consistency fix and a maintainability one.
- **Automated accessibility testing in CI:** `jest-axe` (or `@axe-core/playwright` if you're already using Playwright for E2E) run against the dashboard, Active Recall, Board Simulator, and results screens, failing the build on any new critical/serious violation.
- **Lighthouse CI budget enforcement:** add a `lighthouserc.js` with explicit budgets (LCP < 2.5s, INP < 200ms, CLS < 0.1, accessibility score ≥ 95) wired into GitHub Actions, so a performance or accessibility regression fails the PR instead of shipping silently.
- **Reduced motion and focus management:** wrap any CSS animation in `@media (prefers-reduced-motion: no-preference)`, and implement a focus trap for modals (a small hand-rolled one is fine — no need for a heavy library) so keyboard users can't tab behind an open dialog.
- **Board Simulator distraction-free mode:** a dedicated layout/route that suppresses nav chrome, notification badges, and gamification UI for the duration of a timed exam — implement this as a layout-level concern (a `SimulatorLayout` wrapper), not per-component conditionals scattered through the exam screen.

**Gate:** Lighthouse CI passes the stated budgets on the four key screens, axe reports zero critical/serious violations, and design tokens/shared components are in place (spot-check: no new hardcoded hex or arbitrary spacing values introduced during this phase).

## 6. Phase 3 — Content and assessment depth

This phase has the most technical depth of the five, since it's what makes the app genuinely adaptive rather than adaptive-looking.

- **Syllabus-weighted question distribution:** encode the actual PRC REE board exam subject weightings (Mathematics, Electrical Engineering, Utilization & Illumination Engineering, Power/Industrial Electronics, etc.) as a config table (`syllabus_weights`), and use it to constrain Board Simulator question selection so a full mock exam's subject proportions match the real exam, not an even or arbitrary split. Verify the weightings against the current PRC REE syllabus before encoding them — don't assume last year's weighting still holds.
- **Item difficulty recalibration pipeline:** a scheduled job (Supabase Edge Function on a cron trigger, or a simple node-cron process) that periodically recomputes each question's empirical difficulty and discrimination parameters from actual response data, rather than relying solely on author-assigned difficulty. Start simple — a 1PL (Rasch) or 2PL joint maximum likelihood estimation over the response matrix is sufficient; you don't need a full IRT library, a few hundred lines implementing JMLE is tractable. Store the recalibrated parameters as `empirical_difficulty`/`empirical_discrimination`, keep the author's original as a fallback for low-response-count items, and blend the two based on response count (e.g. shrink toward author estimate when n < 30 responses).
- **Bayesian Knowledge Tracing as a complementary mastery signal:** alongside the per-question IRT theta, track a per-skill/topic `P(mastery)` using BKT (four parameters per skill: p-init, p-learn, p-slip, p-guess). This gives you a topic-level mastery signal that's more interpretable to the user ("You've mastered Illumination Engineering fundamentals") than a raw theta value, and is what should drive the topic mastery heatmap in the results view.
- **Topic mastery heatmap:** requires a proper question→topic taxonomy in the schema (many-to-many if questions span topics, otherwise many-to-one) — audit whether this taxonomy already exists cleanly or is currently inferred from folder/category naming, and formalize it as a real relation if not.
- **AI content review loop:** questions generated via Gemini land in a `questions_pending_review` table, not directly in the live `questions` table. Build a minimal admin review UI (approve/edit/reject), and keep a `question_versions` history table so edits are auditable — given a wrong "correct answer" is one of the worst possible failure modes for this app, this gate should not be optional even though it slows down content velocity.
- **Confidence-vs-Accuracy Matrix extension:** if not already capturing a confidence rating alongside each answer, add it (a lightweight 1-4 scale at submission time), since the matrix is only as good as the confidence input feeding it.

**Gate:** syllabus weighting is verified against the current PRC REE syllabus and used in Board Simulator selection; the recalibration pipeline has run successfully at least once against real response data; the topic mastery heatmap renders from a real taxonomy relation (not inferred categories); the AI review loop has processed at least one full batch of generated questions before promotion to live.

## 7. Phase 4 — Competitive layer and scale

- **Real-time Battles transport:** since you're already on Supabase, use Supabase Realtime channels for matchmaking and live battle state rather than standing up a separate WebSocket server — it's one less piece of infrastructure to operate solo.
- **Server-authoritative scoring:** the server, not the client, must be the source of truth for who answered first/correctly in a Battle — validate timestamps server-side and treat client-reported timing as advisory only. This is the same trust boundary principle as the offline mock exam grading, applied to real-time instead of async.
- **Anti-abuse on rapid submission:** rate-limit answer submissions per user per battle to prevent a scripted client from gaming response time.
- **Leaderboard as a materialized/aggregated view**, not a live query over raw attempts: a scheduled aggregation (Postgres materialized view refreshed on an interval, or a Supabase Edge Function) so leaderboard reads don't hammer the primary tables as usage grows. Feed the offline-exclusion flag from the offline-mode work directly into this aggregation, not as an afterthought filter.
- **Native wrapper:** Capacitor around the existing PWA build, reusing Firebase Auth (already in place) for Firebase Cloud Messaging push notifications — spaced-repetition reminders and Battle invites are natural first uses of push.
- **Feature flagging for rollout:** even a simple `feature_flags` table (or env-based flags) so Battles and any new competitive feature can be rolled out to a subset of users before a full launch — useful leverage for a solo maintainer who can't dogfood at scale internally.

**Gate:** a Battle completes correctly under simulated network latency with server-authoritative scoring; the leaderboard reflects state within an acceptable delay (define this — e.g. under 60 seconds) without querying raw attempt tables directly; offline-flagged attempts are verifiably excluded from leaderboard aggregation.

## 8. Cross-cutting engineering practices (apply throughout, not a separate phase)

- **Testing pyramid, prioritized in this order:** unit tests for scoring/IRT/SRS/BKT logic first (highest stakes, most reused), integration tests for API routes second, Playwright E2E for the critical user journeys (complete a session, complete a mock exam, go offline mid-session and reconnect) third.
- **Structured error monitoring:** Sentry (or equivalent) wired in before Phase 2 ships to real users, so accessibility/performance regressions and silent scoring failures surface instead of disappearing.
- **Staging environment:** a deploy target that mirrors production but isn't user-facing, used to validate each phase gate before promoting — non-negotiable once Phase 3's recalibration pipeline and Phase 4's real-time scoring exist, since both are the kind of thing you do not want to debug live against real exam candidates' data.

## 9. Summary of gates (quick reference)

| Phase | Gate condition |
|---|---|
| 0 — Foundation | Standing CI checks for SQL interpolation and route auth coverage pass; IRT unit tests verified against hand-computed values |
| 1 — Offline | Offline DoD checklist complete; Dexie migration path documented; per-resource Workbox strategies explicit |
| 2 — UX/accessibility | Lighthouse CI budgets pass; axe zero critical/serious; design tokens and shared components in place |
| 3 — Content/assessment | Syllabus weighting verified and applied; recalibration pipeline run once against real data; mastery heatmap on real taxonomy; AI review loop processed one batch |
| 4 — Competitive/scale | Battle scoring server-authoritative under latency test; leaderboard aggregated, not live-queried; offline exclusion verified in aggregation |
