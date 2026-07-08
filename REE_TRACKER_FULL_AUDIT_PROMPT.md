# Audit prompt: REE Tracker — bugs, UI/UX, performance, and security

Paste this whole document as the task brief for an agent with full repository access (clone `VariaresDree/ree-tracker-fullstack`, branch `main`). It extends the prior functional/security audits to cover design and performance, and it assumes the offline-mode implementation from `OFFLINE_MODE_IMPLEMENTATION_PROMPT.md` may already be landed or in progress — check for it and audit it too if present.

---

## 1. Context

REE Tracker is a full-stack PWA for Philippine Registered Electrical Engineer board exam preparation. Stack: React + Vite + Zustand (frontend), Express + Prisma + Supabase Postgres (backend), Firebase Auth, Google Gemini for AI-generated content. Prior audits (documented in `REE-Tracker-Audit-Report.md`) resolved an auto-admin privilege escalation bug, SQL injection via raw string interpolation of `req.query.subject`, an exposed Gemini API key, a broken IRT engine (difficulty argument mismatch), missing database indexes, and unauthenticated endpoints. This audit assumes those are fixed — verify they haven't regressed, but the primary focus here is everything those audits didn't cover: UI/UX quality, accessibility, responsive/performance behavior, and any remaining or newly introduced architectural risk.

## 2. Objective

Produce a structured findings report plus a fixed codebase, covering five domains with equal rigor — do not let backend bug-hunting crowd out the UI/UX and performance passes, which is what happened to be lighter in prior rounds:

1. Functional correctness & bugs
2. UI/UX & accessibility
3. Responsive performance
4. Secure architecture
5. Code quality & engineering practices

## 3. Method

- Clone the repo and read it in full — routes, controllers, middleware, frontend store, hooks, engines, components, and any offline-mode code if present.
- For UI/UX and responsive passes: actually render the app (locally or via a deployed preview if available) at minimum at three breakpoints — 360px (small Android), 768px (tablet), 1440px (desktop) — rather than inferring layout from JSX alone.
- Cross-reference frontend components against backend contracts to catch mismatches (stale prop shapes, silently-failing API calls, unhandled error states).
- Where tooling is available, run Lighthouse (performance + accessibility categories) and axe-core against key screens: dashboard, Active Recall session, Board Simulator, and results/analytics view.
- Do not fix findings silently as you go without logging them — every fix must trace back to a numbered finding in the report, same as prior audit rounds.

## 4. Audit domains and the standards to apply

### 4.1 Functional correctness & bugs

- Re-verify none of the previously fixed issues have regressed (auto-admin, SQL injection, exposed keys, IRT difficulty bug).
- Race conditions and stale state in Zustand — especially around session start/submit/resume flows.
- Silent failures: API calls with no error handling, promises without `.catch`, missing loading/error UI states.
- Data integrity in scoring, SRS scheduling, and the Board Readiness Index / Confidence-vs-Accuracy Matrix calculations — verify the math against the intended formulas, not just that it runs without throwing.
- If offline-mode code exists: verify sync outbox idempotency actually holds under flaky-connection simulation (toggle network mid-sync), and that offline mock exam attempts are correctly excluded from leaderboards until server re-verification, per that spec.

### 4.2 UI/UX & accessibility

Apply Nielsen's usability heuristics as the baseline lens: visibility of system status, match between system and real world, user control and freedom, consistency and standards, error prevention, recognition over recall, flexibility and efficiency, aesthetic and minimalist design, error recovery, help and documentation.

Specific checks:
- **Accessibility (WCAG 2.1 AA):** color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text/UI components; all interactive elements keyboard-reachable and operable; visible focus states; touch targets ≥ 44×44px; form inputs have associated labels; images have meaningful alt text; no information conveyed by color alone (relevant for correct/incorrect answer states — color-blind users need a shape/icon cue too, not just green/red).
- **Consistency:** spacing scale, typography scale, and color tokens used consistently across Active Recall, Board Simulator, Gauntlet, and Arena — flag any screen that clearly diverged from a shared design system versus one built ad hoc.
- **Exam-specific UX:** Board Simulator mode should minimize distraction (no stray notifications, nav chrome, or gamification elements bleeding into a timed exam screen); progress and remaining-time indicators must be unambiguous; post-session feedback should be encouraging without obscuring the actual performance data (don't let UX polish soften what should be a clear-eyed assessment).
- **Error states:** what does the user see on a failed submission, a lost connection mid-session, or an empty state (no questions downloaded, no history yet)? Each needs a designed state, not a blank screen or console error.
- **Onboarding & recall:** is it obvious to a first-time user what Active Recall vs. Gauntlet vs. Arena vs. Board Simulator actually do, without requiring them to already know the app?

### 4.3 Responsive performance

Targets (Core Web Vitals, measured on the key screens listed in Section 3):
- Largest Contentful Paint (LCP) < 2.5s
- Interaction to Next Paint (INP) < 200ms
- Cumulative Layout Shift (CLS) < 0.1

Checks:
- Bundle size: identify what's in the initial JS payload versus what should be code-split (Gemini/AI-generation code, admin views, analytics charting libraries, and anything Board-Simulator-only should not block the initial dashboard load).
- Image handling: are question/explanation images served at appropriate sizes, lazy-loaded below the fold, and in a modern format? Flag any unoptimized full-resolution images being shipped to mobile.
- Re-render behavior: profile the Zustand store for unnecessary re-renders — a timer ticking in Board Simulator, for instance, should not re-render the entire question list every second.
- Network waterfall on a throttled "Slow 4G" profile — this matters concretely here given the target user base is often on mobile data in the Philippines, not just as a generic best practice.
- Verify responsive breakpoints don't just reflow but remain usable — check touch target spacing and readability at 360px specifically, not just that nothing visually breaks.

### 4.4 Secure architecture

Apply OWASP Top 10 as the checklist, with emphasis on what's likely still relevant post prior fixes:
- Broken access control: spot-check every route for correct auth middleware and role checks, not just the ones flagged before.
- Injection: confirm no other raw string interpolation into SQL/Prisma queries exists elsewhere in the codebase besides the one already fixed.
- Sensitive data exposure: check environment variable usage end to end (server-only keys never reaching the client bundle), and specifically audit any offline-mode local storage — if the offline mock exam answer key is stored in IndexedDB per the offline spec, confirm it isn't trivially readable via browser dev tools in a way that undermines the leaderboard-exclusion safeguard.
- Rate limiting and abuse: are submission endpoints (`/telemetry-bulk` and equivalents) protected against replay or flooding, especially now that offline sync will burst-submit queued items on reconnect?
- Dependency audit: run `npm audit` (or equivalent) and flag any high/critical vulnerabilities in current dependencies.
- CORS and security headers: confirm CORS is scoped to expected origins (not `*`), and check for missing standard headers (CSP, X-Content-Type-Options, etc.).

### 4.5 Code quality & engineering practices

- Confirm the previously-flagged empty `controllers/services/config` scaffolds have been (or should be) filled in — logic inlined directly in route files is a maintainability risk as the app grows.
- DRY violations: duplicated scoring/validation logic between frontend and backend (or between old and new IRT modules if the shared-module refactor from the offline plan hasn't landed yet).
- Test coverage: identify critical paths (scoring, SRS, IRT selection, sync outbox) with no automated tests, and flag them as the priority order for adding coverage — don't ask for 100% coverage broadly.
- Error logging: is there structured server-side error logging, or do failures disappear silently in production?

## 5. Deliverables

1. `REE-Tracker-Audit-Report-v2.md` — findings grouped by domain (4.1–4.5), each with: severity, description, affected file(s)/line(s), reproduction steps where applicable, and recommended fix.
2. A fixed codebase (or PR-ready diff) implementing the Critical and High severity fixes; Medium/Low can be logged as backlog items with fixes proposed but not necessarily applied, unless trivial.
3. A short summary at the top of the report: total findings by severity and by domain, so the scope of the pass is visible at a glance.

## 6. Severity taxonomy

- **Critical:** exploitable security hole, data loss, or scoring/grading correctness failure that would misrepresent a user's readiness.
- **High:** broken core flow (session doesn't complete, sync corrupts data, WCAG failure that blocks keyboard/screen-reader users entirely).
- **Medium:** degraded UX, performance regression under normal conditions, inconsistent design system usage.
- **Low:** polish, minor inconsistency, non-blocking edge case.

## 7. Constraints

- Do not reintroduce any previously fixed vulnerability while refactoring for UI/UX or performance — cross-check against `REE-Tracker-Audit-Report.md` before merging changes.
- Any fix touching a function signature must update every consumer of that function — this exact failure mode (AI-assisted patches changing signatures without updating callers) was flagged as a recurring pattern in prior rounds.
- Accessibility and performance fixes must not regress the intentional instant-feedback UX in Active Recall (confirmed correct behavior, not a bug, in the prior audit).

## 8. Definition of done

- [ ] All five domains (4.1–4.5) have documented findings, not just functional bugs.
- [ ] Lighthouse/axe results (or equivalent manual findings) included for the four key screens.
- [ ] Three breakpoints (360px, 768px, 1440px) explicitly verified, not inferred.
- [ ] Core Web Vitals measured against the stated targets, with gaps identified.
- [ ] `npm audit` (or equivalent) run and results included.
- [ ] Offline-mode code, if present, is in scope for both the security and UX passes — not treated as a separate system.
- [ ] Every Critical/High finding has either a fix applied or a clearly justified reason it wasn't.
