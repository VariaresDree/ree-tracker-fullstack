// src/services/simulationLedger.js
//
// RETIRED device-local mock-exam ledger — what is left is cleanup.
//
// Sittings used to be recorded only here, in IndexedDB: first under one
// unscoped key (`ree_simulation_ledger`, which leaked one account's history to
// the next on a shared device), then per account
// (`ree_simulation_ledger:<uid>`). Mock history is now server-authoritative
// (GET /api/analytics/deep/mock-history), so nothing writes or reads these keys;
// they are removed once the server copy has loaded, on sign-out, and on account
// deletion.
import { del } from 'idb-keyval';

export const LEGACY_LEDGER_KEY = 'ree_simulation_ledger';
export const ledgerKey = (uid) => `${LEGACY_LEDGER_KEY}:${uid}`;

/** Remove one account's local ledger. */
export const purgeSimulationLedger = async (uid) => {
    if (uid) await del(ledgerKey(uid));
};

/** Remove the old unscoped ledger. */
export const dropLegacyLedger = async () => {
    await del(LEGACY_LEDGER_KEY);
};
