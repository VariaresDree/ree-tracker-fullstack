# Offline storage: current design + Dexie migration path

## Current design (v1) — idb-keyval + Zustand persist

We deliberately did **not** migrate to Dexie (see [ROADMAP.md](../../ROADMAP.md) decision 1). A three-agent gap analysis found the existing offline stack ~70% spec-complete and recently hardened (PR #40), so we adapt it rather than rewrite the data layer.

Storage today is **key/value blobs in IndexedDB via `idb-keyval`**, behind the Zustand persist adapter (`ree-tracker/src/store/useStore.js`) plus a few direct keys:

| Key | Written by | Holds |
|---|---|---|
| `ree-tracker-secure-storage` | Zustand `persist` (`useStore.js`) | store slice: `syncQueue`, `pendingWrites`, `deadLetters`, `stats`, `pomodoro`, `theme`, `dynamicTOS` |
| `ree_offline_pack_v1` | `refreshOfflinePack` (`dbQueries.js`) | `{ version, fetchedAt, subjects, checksums }` — the offline question pack (now delta-refreshed via `/api/questions/pack-manifest`) |
| `ree_reference_cache_v1` | `writeReferenceCache` (`offlinePack.js`) | admin constants/formulas delta |
| `ree_sim_cache` (localStorage) | `useSimulatorEngine` | in-progress exam draft (answers/confidences/index/endTime) — survives app kill |
| `ree_pending_sync` (localStorage) | `useSyncLifecycle` pagehide | last-gasp sync-queue mirror |

The outbox (`syncQueue` per-attempt + `pendingWrites` whole-request) is flushed on `online` + a 15s safety-net interval (now with **exponential backoff**), deduped server-side by `clientAttemptId`.

## When to revisit Dexie (v2 trigger)

Move to Dexie only if we hit a concrete need the blob model handles poorly:
- **Relational/queryable offline data** — e.g. per-subject `srsState`/`irtState` tables that need indexed lookups rather than a single serialized array.
- **Large offline datasets** — the current pack is a bounded snapshot (~400 items/subject); a full-bank offline mode would benefit from indexed tables + cursor iteration instead of loading one big JSON blob into memory.
- **Concurrent multi-tab writes** — Dexie's transactions are safer than read-modify-write on a shared idb-keyval blob.

## Dexie migration pattern (documented now, per the orchestration prompt)

If we adopt Dexie, define schema versions **from v1** so future migrations are cheap. Retrofitting Dexie migrations onto live user data later is materially harder than having the pattern in place.

```js
// db/offlineDb.js
import Dexie from 'dexie';

export const db = new Dexie('ree_offline');

// v1 — mirror today's blob shapes as tables.
db.version(1).stores({
  attempts:     'uuid, sessionId, questionId, synced',   // was: syncQueue array
  pendingWrites:'id, endpoint, createdAt',                // was: pendingWrites array
  sessions:     'uuid, type, synced, startedAt',
  srsState:     'questionId, dueAt',                      // NEW — no local store today
  irtState:     'subjectId, lastUpdated',                 // NEW — no local store today
  contentPacks: 'subjectId, version, checksum, downloadedAt',
});

// v2 example — add an index / reshape without losing data. ALWAYS ship the
// upgrade() so existing users' rows are migrated, never dropped.
db.version(2).stores({
  attempts: 'uuid, sessionId, questionId, synced, offline', // + offline flag index
}).upgrade(async (tx) => {
  await tx.table('attempts').toCollection().modify((a) => {
    a.offline = a.offline ?? false;
  });
});
```

### One-time cutover from idb-keyval → Dexie
1. On first load after the Dexie release, read the legacy keys (`ree-tracker-secure-storage`, `ree_offline_pack_v1`) with `idb-keyval`.
2. Bulk-insert their contents into the Dexie tables inside a single transaction.
3. Mark a `migratedToDexie` flag; on success, `del()` the legacy keys.
4. Keep the outbox contract identical (`clientAttemptId` dedupe) so in-flight offline data syncs the same way before and after.

### Rules
- Every schema change is a **new `db.version(n)`** with a `.stores()` and, when data shape changes, an `.upgrade()` — never mutate a released version.
- Never delete a user's local rows during upgrade; transform in place.
- Keep the server dedupe (`clientAttemptId`) as the source of exactly-once truth regardless of local engine.
