# ADR-002: Delta-Sync content delivery — verified architecture for constantly-expanding content

**Status:** Accepted (Phase 0 implemented; Phases 1–3 designed, deferred)
**Date:** 2026-07-21
**Deciders:** Variares (sole maintainer)
**Extends:** ADR-001 (offline sync: keep delta-sync outbox, add server-assigned `version` numbers) and `OFFLINE_MODE_IMPLEMENTATION_PROMPT.md`. Supersedes the Dexie assumption in both (see §1).

## Context

Adding or editing a question is a content change that must reach users: it must appear in randomized practice immediately, enter Active-Recall (SRS) queues, and not sit stale in an offline pack. This ADR records a **verification of the two design docs against the actual code** (because they describe a target, not the current system), then defines the delivery architecture grounded in what actually exists, and sequences the work.

## 1. Verification — docs vs. reality (the load-bearing finding)

| Doc claim | Verdict | Evidence |
|---|---|---|
| ADR-001: storage engine is **Dexie** | **CONTRADICTED** | The app uses **`idb-keyval`** (`ree-tracker/package.json`, `src/services/offlinePack.js`, `src/store/useStore.js` persist adapter). Dexie was **formally rejected** in `ROADMAP.md` ("Offline: adapt, don't migrate to Dexie"). Dexie appears only as a *future* migration sample in `docs/offline/dexie-migration-path.md`. **Only "IndexedDB" and "manual outbox" hold.** |
| ADR-001: idempotent-UUID, append-only writes | **CONFIRMED** | `clientAttemptId` + `@@unique([userId, clientAttemptId])` + `createMany({ skipDuplicates })` (`telemetryService`), plus the `Idempotency-Key` middleware and content-hash `stableBatchKey`. Solid foundation — reuse. |
| ADR-001: **server-assigned monotonic `version` column + version-checked LWW** on mutable per-user tables | **NOT PRESENT** | No `version` on `User` / `SRSCard` / `UserAbility`. Mutable-state sync is naive upsert/last-writer-wins (`srsRoutes` `/review` upsert, `userRoutes` settings). `theta` uses a `FOR UPDATE` serialized read-modify-write — still no version. Not even documented in-repo. **The ADR's headline refinement is entirely unbuilt.** |
| V2: randomized practice always draws from the **live** set | **CONFIRMED** | `questionPool.samplePool` runs `ORDER BY random()` (stratified by subtopic) on the live `Question` table each call. No CDN/API cache TTL on question endpoints; no build-time bundled question array. |
| V2: publish → content-pack version/checksum picks it up automatically | **CONFIRMED (with an edit gap)** | `GET /questions/pack-manifest` computes an md5 checksum **live** from the table, so a new question auto-changes it and `refreshOfflinePack` delta-re-downloads. **Gap (now fixed, §3):** the checksum originally folded only `id~answer~subtopic`, so text/option/difficulty edits didn't change it. |
| V2: adaptive engine works for zero-response items | **CONFIRMED** | Author-difficulty fallback in the 3PL params (`telemetryHelpers.toEstimatorPair`, `examRoutes` CAT pool) + `calibrationService.blendParams` (`AUTHOR_PRIOR_N=30`, `minN=10`) blends toward the empirical fit as responses accrue. |
| V2: Active-Recall (SRS) mode + new-card injection + per-day cap | **NOT PRESENT** | SRS is **dead code**: `hooks/useSRS.js` / `logSRSRecord` are never imported; no `SRSCard` row is ever created by the app; `/srs/due` only returns pre-existing rows; there is no Randomized-vs-SRS mode selector in `ReviewSetup`/`useReviewSession`. Active Recall is effectively an unbuilt feature. |
| V2: `content_version` + edited-question re-surface | **NOT PRESENT** | No `content_version` on `Question`; no per-user last-seen-content tracking. `QuestionVersion` is an admin **audit** table (pre-edit snapshots), not a delivery mechanism. |
| V2: hard subject/topic promotion validation | **NOT PRESENT → FIXED (Phase 0, §3)** | `createLiveQuestion` defaulted `subject:'Unknown'`/`subtopic:'General'`, `topicId:null` tolerated — no rejection. |

**Bottom line:** live selection, live checksum, and adaptive bootstrap already satisfy V2's §3/§5(new)/§6. Faithfully implementing the rest of V2 requires first building ADR-001's version path **and** the SRS feature from scratch — both migration-dependent. This ADR corrects the Dexie assumption and sequences the work so the version-checked path is built once, as ADR-001 intends (one write path, two callers).

## 2. Architecture (grounded in the real `idb-keyval` outbox)

**Content freshness — keep as-is, protect by invariant.** Online practice is served live (`samplePool`, `ORDER BY random()`); offline packs delta-refresh off the live md5 checksum. **Guardrail (V2 §8):** never reintroduce a build-time-bundled or long-cached question list. The only client snapshot is the runtime `ree_offline_pack_v1` IndexedDB blob, used only on the `[OFFLINE]` sentinel.

**Adaptive bootstrap — keep as-is.** New questions are immediately selectable (samplers filter `isFlagged=false`, not attempt count) and use author difficulty until `minN` responses, then blend. Do not invent a second scheme.

**Mutable-state conflict resolution — the deferred foundation (ADR-001).** Add a **server-assigned monotonic `version`** to the mutable per-user tables, checked on write (accept iff client's `version` == server's; else server wins and returns current state for local reconciliation). Two design rules from V2 §4:

- **Per-row scope, not per-user.** For SRS the `version` is **per `SRSCard` (per question, per user)**. A content-publish injection to one card must not bump a counter shared across the user's whole SRS state, or an unrelated legitimate offline update to a *different* card would be wrongly rejected as stale.
- **One write path, two callers.** User-originated offline-sync writes and system content-injection writes go through the *same* accept/reject-by-version logic. The system injection only touches fields it owns (e.g. `is_new_card_pending`) and never clobbers user-owned fields (`interval`, `easeFactor`). Do **not** add a second bypass path for "system" writes.

**Edited-question re-surface — deferred.** Server-assigned monotonic `content_version` int on `Question`, bumped only on a **material-change flag** set by the editor (cosmetic typo fixes don't re-surface; no unreliable content-diffing). Track each user's last-seen `content_version` per question; if the server's is higher, re-surface soon in Active Recall rather than trusting SRS mastery built on old content.

**SRS Active-Recall feature — deferred (it's a feature build).** Add the mode selector (`Randomized Practice` vs `Active Recall`), create `SRSCard` rows on review, wire `/srs/due`, then layer new-card injection (Anki-style `new-items-per-day` cap so a 50-question batch publish doesn't flood a session) through the version-checked path above.

**Propagation trigger — publish is the single event.** Promoting a question already (a) makes it live-queryable instantly and (b) bumps the subject checksum via the live md5 (checksum-based cache invalidation — a one-writer/many-reader signal, deliberately *not* the per-row version counter). Once Phases 1/3 land, promotion also fires the SRS injection in the same step. No manual cache clear, redeploy, or human sync step at any phase.

## 3. Phase 0 — implemented in this change (backend-only, no migration)

1. **Hard subject validation at the single promotion choke point** (`reviewService.createLiveQuestion`, called by `questionRoutes POST /` and `reviewRoutes` approve). Rejects with a 400 (`code: 'INVALID_TAXONOMY'`) unless the subject normalizes to a canonical live subject — `SUBJECT_VARIANTS[normalizeSubject(subject)]` (Mathematics/ESAS/EE, spelling-variant aware). Runs before any DB access. Pending-review drafts are unaffected (they don't promote through this path). Closes V2 §6's "can't silently enter syllabus-weighted selection with no weighting."
   - *Note:* the gate uses `SUBJECT_VARIANTS[normalizeSubject(...)]`, **not** `getSubjectFilter()` — the latter passes unrecognized subjects through as a raw string (truthy) and would not reject them.
2. **Pack checksum covers material edits.** `pack-manifest` now folds a per-row `md5(text || options || difficulty)` into the subject checksum, so editing a live question's stem/choices/difficulty changes the checksum and offline clients delta-re-download it; an identical re-save leaves it unchanged. Query-only, offline-path-only (online is always live).

## 4. Phased roadmap (deferred)

- **Phase 1 — version foundation (migration):** add `version Int @default(1)` to `SRSCard`, user settings on `User`, and `UserAbility`; implement the accept/reject-by-version write path (one path, two callers). Requires `prisma db push` on deploy.
- **Phase 2 — edited-content re-surface (migration):** `content_version Int` on `Question` + a per-user last-seen map; bump on material-change flag; re-surface in Active Recall.
- **Phase 3 — SRS Active-Recall feature:** mode selector, card creation on review, `/due` wiring, then new-card injection with the per-day cap through the Phase 1 path.

## 5. Consequences & re-evaluation triggers (carried from ADR-001)

- **Re-evaluate PowerSync** if REE Tracker adds native mobile (React Native/Flutter) — a second hand-rolled offline store per platform is where a managed engine wins.
- **Re-evaluate CRDTs (Yjs)** only when a genuinely concurrent multi-writer feature is scoped (collaborative notes, co-edited decks) — not preemptively.
- The Dexie table design in `OFFLINE_MODE_IMPLEMENTATION_PROMPT.md` §3 is **overruled** by `ROADMAP.md`; the live architecture is `idb-keyval` blobs. Treat any Dexie adoption as its own ADR.
