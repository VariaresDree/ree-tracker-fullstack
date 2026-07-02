# Scaling Guide — REE Board Exam Review Platform

Current architecture: **single-instance modular monolith** — Vite/React SPA on Vercel,
one Express + Socket.io process on Render, Supabase Postgres, Firebase Auth (auth only —
all exam data lives in Postgres). This is the right shape for the current stage. This
document describes what breaks first as usage grows and the cheapest fix for each,
so scale-up work is deliberate instead of reactive.

## What is deliberately in-memory today (single-instance assumptions)

| State | Where | Breaks when |
|---|---|---|
| Battle lobbies + answer keys | `src/sockets/battleSocket.js` (`battleLobbies` Map) | Process restart mid-battle, or >1 instance |
| Dashboard cache (30s TTL) | `src/routes/analyticsRoutes.js` (`dashboardCache`) | >1 instance (stale reads per instance) |
| Idempotency store (10min LRU) | `src/middlewares/idempotency.js` | >1 instance (replays land on the other instance) |
| Admin-role cache | `src/middlewares/adminMiddleware.js` | >1 instance (role revocation lag) |
| Rate-limiter counters | `express-rate-limit` default MemoryStore | >1 instance (limits multiply per instance) |

A mid-battle **restart** is already partially mitigated: the socket layer lazily
refetches the answer key from `Battle.questions` in Postgres, so reconnecting players
can finish and submit; only unfinished live progress is lost.

## Redis — optional, and when to actually add it

Do **not** add Redis until one of these is true: (a) you need a second backend
instance, (b) Render restarts are visibly orphaning battles, or (c) dashboard traffic
makes the per-instance cache miss rate matter. When it is time, one managed Redis
(Upstash/Render Redis) covers all five tables above:

1. **Socket.io adapter** — `@socket.io/redis-adapter` so battle rooms span instances.
2. **Lobby state** — move `battleLobbies` to Redis hashes (`battle:{id}:participants`,
   `battle:{id}:answers:{uid}`) with a TTL; the finalize guard already uses an atomic
   `updateMany` on Postgres, so it stays correct under multi-instance.
3. **Idempotency + dashboard cache** — swap the two Maps for `SET key val EX ttl NX`.
4. **Rate limiting** — `rate-limit-redis` store for `express-rate-limit`.

Keep every Redis usage behind the existing module boundaries (`idempotency.js`,
`analyticsRoutes` cache helpers, `battleSocket` lobby helpers) so the swap is a
storage-driver change, not a rewrite. Pattern to follow: `src/services/storage.js`
already does driver switching (local disk vs S3) via env var.

## Microservices — the honest recommendation

Stay a **modular monolith**. The codebase already has the right seams
(`services/`, `engine/`, `sockets/`, `routes/`); a network boundary between them
would add latency, deploy complexity, and distributed-failure modes with zero
benefit at this scale. The only component with a genuinely different scaling
profile is the **real-time battle namespace** (long-lived websockets vs short HTTP
requests). If battles get big enough to interfere with API latency, extract *only*
that: a second Render service running the socket namespace + Redis adapter,
pointed at the same Postgres. Everything else (IRT, Elo, forecast, telemetry)
should stay in-process — they are CPU-light per request and share transaction
boundaries with the data they write.

If IRT calibration or Monte-Carlo forecasting ever becomes heavy enough to block
the event loop under load, the fix is a **job, not a service**: run
`scripts/calibrate.js` on a Render cron (already scaffolded, commented out in
`render.yaml`) instead of the on-demand admin endpoint.

## Data growth & retention

- `QuestionAttempt` is the only unbounded high-velocity table (one row per answered
  question, indexed on `(userId, createdAt)`, `(userId, subject)`, `(userId, mode,
  createdAt)`). At ~1M rows/year for a few hundred active users this is fine for
  years; revisit with pg partitioning by `createdAt` if it passes ~50M.
- `ThetaHistory` and `ActivityLog` are already deduped to one row per user per
  Manila day — bounded, no action needed.
- `ExamSession` / `StudySession` grow linearly with sessions. Suggested policy:
  archive (or aggregate into monthly summary rows) anything older than 2 years —
  a review journey rarely exceeds 18 months.
- Backups: Supabase PITR covers the DB; `Battle.questions` snapshots inflate row
  size (~50-100KB/battle) — consider a cleanup job deleting `Battle` rows older
  than 90 days (cascades to `BattleOutcome` — export aggregates first if you want
  lifetime battle stats).

## Deployment reminders

- CORS is strict only when `FRONTEND_URL` is set — it must always be set on Render.
- Schema changes deploy via `npx prisma db push` (no migrations directory).
- Backend and frontend battle protocol are coupled (sanitized questions +
  `battle-answer`/`battle-graded` events) — deploy both sides in the same window.
