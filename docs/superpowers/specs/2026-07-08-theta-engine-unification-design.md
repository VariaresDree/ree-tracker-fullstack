# Theta-engine unification — design spec

**Date:** 2026-07-08
**Status:** Draft (awaiting review)
**Depends on:** the four-pillar audit remediation (PR #40) — touches some of the same files.

## Context / problem

The app maintains a user's latent ability, `User.thetaRating`, but computes it with **two divergent estimators on incompatible scales**:

- **Rasch gradient step** — `utils/irtMath.js` `calculateUpdatedTheta` (implicit scale 1, α=0.15 fixed step, clamp ±3). This is the *only* estimator that persists `User.thetaRating`, via the single choke point `telemetryService.recordAttempts`. It feeds the dashboard, the `ThetaHistory` velocity chart (frontend hardcodes the ±3 scale), and the forecast.
- **3PL Bayesian MLE** — `engine/irt.js` `updateTheta` (Birnbaum scale 1.7, Newton–Raphson, clamp ±4). Used by the CAT `/next-item` endpoint, which reads `User.thetaRating` as its 3PL *prior* and compares it against 3PL item difficulties (`irtB`).

Two concrete consequences:

1. **Cross-contamination (the active bug):** `examRoutes.js:250` seeds the 3PL model with a Rasch-scale theta and compares it against `irtB` (3PL scale) — mismatched units, so adaptive item selection targets the wrong difficulty.
2. **Miscalibrated forecast (latent):** `engine/forecast.js` is explicitly written for a `Normal(0,1)` / 3PL scale (cutoffs `PASS=0.0`, `TOPNOTCHER=1.5`) but is *fed* Rasch theta. And `standardError` is **read** by the forecast/CAT/readiness but **never written** anywhere (always the `0.5` default), so the forecast confidence band is static.

## Goal

Make `engine/irt.js` `updateTheta` the **single estimator** for `User.thetaRating` **and** `User.standardError`, so every consumer interprets theta on one scale. This *fixes* the forecast (it was already designed for this scale) and makes the CAT prior scale-consistent.

Non-goals (explicit YAGNI): per-topic 3PL ability models, time-based `se`-inflation (Glicko-style decay), and re-scaling historical analytics beyond `ThetaHistory`.

## Key design decisions

### D1 — `se`-floor = 0.35 (raise `updateTheta`'s clamp from 0.05)
A naive 3PL posterior *converges*: as evidence accumulates `se→small`, theta gets sticky and stops reflecting genuine improvement — wrong for a months-long review journey. Flooring `se` at **0.35** keeps theta ~65% responsive per active session while still letting the forecast band tighten from the `0.5` default toward `0.35`. Tunable constant; time-based `se`-inflation is the principled future upgrade.

### D2 — One-time recompute script (theta + se + ThetaHistory)
Natural re-convergence would leave **inactive users on the Rasch scale forever**, making cross-user comparisons (leaderboard, forecast) mix scales indefinitely. A one-time, idempotent `scripts/recomputeTheta.js` replays each user's `QuestionAttempt` history (chronologically) through `updateTheta` to set a clean `thetaRating`+`standardError`, and regenerates `ThetaHistory` (one point per Manila day) so the velocity chart has no scale discontinuity. Touches only derived fields; ignores timing (immune to historical timing-corruption); re-runnable. Run once post-deploy.

### D3 — Switch the single writer; delete dead imports
`recordAttempts` is the sole path that persists `thetaRating` (examRoutes `/grade`+`/submit` and battleSocket all delegate to it; `calculateUpdatedTheta` is a dead import in `examRoutes.js:7`). Unifying = change the theta transaction *inside `recordAttempts`* only, and remove the now-dead Rasch imports. One writer, one scale.

## Components & changes

### Backend

**`services/telemetryService.js` — the theta transaction (the core change)**
- Extend the master-question `select` to include `irtA, irtB, irtC` (keep `difficulty` as the `irtB` fallback).
- Thread those onto each mapped attempt (`_a`, `_b`, `_c`).
- In the existing `FOR UPDATE`-locked block, replace `calculateUpdatedTheta(currentTheta, irtInput)` with:
  ```js
  const prior = { theta: user?.thetaRating ?? 0, se: user?.standardError ?? 0.5 };
  const pairs = newOnly.map((m) => ({
    item: { a: m._a ?? 1, b: m._b ?? m._difficulty ?? 0, c: m._c ?? 0.2 }, correct: m.isCorrect,
  }));
  const est = updateTheta(prior, pairs);   // { theta, se }
  ```
- Persist **both** `thetaRating: est.theta` and `standardError: est.se` in the `user.update`.
- Write `est.theta` into `ThetaHistory` (unchanged one-point-per-day logic).
- Import `updateTheta` from `../engine/irt`; drop the `calculateUpdatedTheta` import.

**`engine/irt.js`**
- Raise the `se` clamp floor: `clamp(se, 0.05, 2.5)` → `clamp(se, 0.35, 2.5)`. Add a named `SE_FLOOR = 0.35` constant with a comment explaining the responsiveness/confidence trade-off.

**`routes/examRoutes.js`**
- Remove the dead `calculateUpdatedTheta` import (line 7). Verify `currentTheta` (line 113) usage — if it only fed a removed computation, drop it; if it's in a response payload, leave it (it now reads the 3PL value, which is correct).

**`scripts/recomputeTheta.js` (new)**
- For each user: load their `QuestionAttempt`s ordered by `createdAt`, join item IRT params, fold through `updateTheta` starting from `{ theta: 0, se: 1.0 }` (a weak neutral prior so history dominates), writing the final `thetaRating`+`standardError`, and rebuild `ThetaHistory` grouped by Manila day (latest theta per day). Idempotent; batched per user; dry-run flag.

### Frontend

**`components/ThetaVelocityChart.jsx`**
- `YAxis domain={[-3, 3]}` → `[-4, 4]`.
- Pass-probability mapping `((theta + 3) / 6) * 100` → `((theta + 4) / 8) * 100` (keep it a rough visual; the authoritative pass % is the forecast's `normCdf`).
- Recompute the "70% threshold" `ReferenceLine` y-value for the 3PL scale.

**`utils/irtMath.js` (optimistic mirror, `calculateUpdatedStats` §7)**
- Align the optimistic theta clamp `±3` → `±4`. Keep the cheap ±0.05/0.03/0.01 heuristic — it's a throwaway placeholder replaced by the server value on reconcile; only its display scale needs to match.

## Data flow (after)

`answer → recordAttempts (3PL updateTheta) → User.thetaRating + standardError + ThetaHistory`
→ read by `dashboard`, `ThetaVelocityChart` (±4), `forecast` (now correctly scaled, real `se` band), and the CAT prior (now scale-consistent with `irtB`).

## Error handling / safety
- `updateTheta` is already finite-hardened (from PR #40: `se`/`theta` coercion). Non-finite inputs can't persist NaN.
- The theta transaction stays `FOR UPDATE`-locked (no new race).
- Recompute is idempotent and dry-runnable; only derived fields; safe to re-run.

## Testing
- `tests/irtEngine.test.js`: (a) `se` never drops below 0.35; (b) after many batches, a run of new *correct* answers still moves theta upward by a meaningful amount (responsiveness / no lock); (c) adjust any existing assertion that expects `se < 0.35`.
- New telemetry-path test: a batch persists **both** `thetaRating` and `standardError`.
- `tests/forecast.test.js`: confidence band tightens as `se` drops from 0.5 → 0.35.
- Recompute script: a small fixture replays deterministically to a stable theta.
- Frontend: `ThetaVelocityChart` renders finite points on the ±4 domain; existing suites stay green.

## Rollout
- **Coupled FE+BE deploy** (the scale change spans the chart + the write path).
- Run `scripts/recomputeTheta.js` once post-deploy.
- Ships as its own PR, layered on (or after) PR #40 since it touches shared files.
