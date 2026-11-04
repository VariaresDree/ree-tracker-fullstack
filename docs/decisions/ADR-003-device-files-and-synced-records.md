# ADR-003: Files stay on the device, records stay synced

**Status:** Accepted
**Date:** 2026-11-04
**Deciders:** Variares (sole maintainer)
**Extends:** ADR-002 (delta-sync content delivery)

## Context

A proposal asked for "local-first" storage with "total device isolation": study metrics, exam history and files kept only on the device, in Dexie, OPFS or SQLite, with backup files for portability.

## Decision

- **Personal files stay on the device and never upload:** imported quizzes and their attempts, and later My files. They live in their own IndexedDB database (`services/deviceStore.js`), keyed by account.
- **Graded answers, ratings, notes and plans stay in Postgres,** cached on the device as they are now. A backup file (PR 8) gives the learner a copy, but restoring never writes graded answers.
- **Quiz files the admin shares live in Postgres** (`QuizFile`, 5 MB each). Downloading one makes a device copy, which then follows the first rule. Scores on it stay on the device.
- **No guest mode.** Sign in once online, then it runs offline.

## Why not total isolation

- Battles, rankings and question calibration need other learners' data.
- Ranked scores rest on the server re-grading each answer, because answer keys already reach devices in the offline pack.
- The owner wants phone and tablet to agree. Device-only records can't.
- Mock history and the Gauntlet ladder were moved off the device after real data loss. Sign-out wipes the device copy, which would become the only copy.

## Why this storage

- **`idb-keyval` with its own store, not Dexie:** `ROADMAP.md` and `docs/offline/dexie-migration-path.md` decided against Dexie, and none of its triggers apply. These records need no queries or indexes.
- **Not SQLite in WebAssembly:** no queries need it, and it's a heavy download against a tight boot budget.
- **Not OPFS, for now:** it shares its quota with IndexedDB, and browsers evict a whole site's data at once, so it buys no safety. Its files aren't visible to the user either. Everything sits behind one module, so it can be swapped if files outgrow Blobs.
- **No encryption at rest:** the key would sit beside the data. Disk encryption is the operating system's job, and the app says so plainly.

## Consequences

- Device data can vanish: a browser can delete a site's data under storage pressure, iOS can clear it after seven days without use unless the app is installed, and clearing browser data removes it. PR 7's storage meter and PR 8's backup file are the answer.
- Sign-out doesn't touch this store. Each account sees only its own records in the app, but they aren't encrypted, so a shared device's other users could reach them with developer tools.
- `quizLauncher.isolation.test.js` holds imported quizzes to this: no store, no server module and no network call.
