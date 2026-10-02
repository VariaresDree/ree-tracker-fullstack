// src/services/simulationLedger.js
//
// Device-local mock-exam ledger (IndexedDB), scoped per account.
//
// It used to live under ONE key, `ree_simulation_ledger`, and ignore the uid
// every caller passed — so on a shared device the next account to sign in saw
// the previous user's mock history, scores and pass rate. Records now live
// under `ree_simulation_ledger:<uid>`.
//
// The old unscoped key cannot be attributed by itself. A caller that knows the
// device's persisted owner matches the signed-in user passes
// `{ claimLegacy: true }` and the records move under that uid; otherwise they
// are dropped rather than shown to someone they may not belong to.
import { get, set, del } from 'idb-keyval';
import { auth } from '../config/firebaseDb';

export const LEGACY_LEDGER_KEY = 'ree_simulation_ledger';
export const ledgerKey = (uid) => `${LEGACY_LEDGER_KEY}:${uid}`;

const newId = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));

export const saveSimulationRecord = async (record, uid = auth.currentUser?.uid) => {
    if (!uid) return { success: false };
    const id = newId();
    const existing = (await get(ledgerKey(uid))) || [];
    existing.push({ ...record, id });
    await set(ledgerKey(uid), existing);
    return { success: true, id };
};

export const fetchSimulationLedger = async (uid, limitParam = 20, { claimLegacy = false } = {}) => {
    if (!uid) return [];
    try {
        let existing = (await get(ledgerKey(uid))) || [];
        const legacy = await get(LEGACY_LEDGER_KEY);
        if (Array.isArray(legacy)) {
            if (claimLegacy && legacy.length > 0) {
                const have = new Set(existing.map((r) => r.id));
                existing = [...legacy.filter((r) => !have.has(r.id)), ...existing];
                await set(ledgerKey(uid), existing);
            }
            await del(LEGACY_LEDGER_KEY);
        }
        return [...existing].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limitParam);
    } catch (error) {
        console.error('Ledger fetch failed:', error);
        return [];
    }
};

export const deleteSimulationRecord = async (uid, recordId) => {
    if (!uid) throw new Error('Failed to delete record.');
    try {
        const existing = (await get(ledgerKey(uid))) || [];
        await set(ledgerKey(uid), existing.filter((r) => r.id !== recordId));
        return { success: true };
    } catch (error) {
        throw new Error('Failed to delete record.');
    }
};

/** Remove one account's ledger — account deletion. */
export const purgeSimulationLedger = async (uid) => {
    if (uid) await del(ledgerKey(uid));
};

/** Remove the old unscoped ledger — called on sign-out, when it can no longer be attributed. */
export const dropLegacyLedger = async () => {
    await del(LEGACY_LEDGER_KEY);
};
