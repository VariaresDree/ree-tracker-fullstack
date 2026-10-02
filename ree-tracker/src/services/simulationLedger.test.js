// The mock-exam ledger lives only on the device (IndexedDB). It used to sit
// under ONE unscoped key and ignore the uid every caller passed, so the next
// account to sign in on a shared phone saw the previous user's mock history,
// scores and pass rate.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
}));
vi.mock('../config/firebaseDb', () => ({ auth: { currentUser: { uid: 'user-A' } } }));

const {
  saveSimulationRecord, fetchSimulationLedger, deleteSimulationRecord,
  dropLegacyLedger, purgeSimulationLedger, LEGACY_LEDGER_KEY,
} = await import('./simulationLedger');

beforeEach(() => idbMem.clear());

describe('simulation ledger', () => {
  it('scopes records to the account that made them', async () => {
    await saveSimulationRecord({ date: '2026-10-01T00:00:00Z', score: 71 }, 'user-A');
    expect(await fetchSimulationLedger('user-A')).toHaveLength(1);
    expect(await fetchSimulationLedger('user-B')).toEqual([]);
  });

  it('defaults to the signed-in user and saves nothing without one', async () => {
    await saveSimulationRecord({ date: '2026-10-01T00:00:00Z', score: 64 });
    expect(await fetchSimulationLedger('user-A')).toHaveLength(1);
    const res = await saveSimulationRecord({ date: 'x', score: 1 }, null);
    expect(res.success).toBe(false);
  });

  it('newest first, limited', async () => {
    await saveSimulationRecord({ date: '2026-09-01T00:00:00Z', score: 50 }, 'user-A');
    await saveSimulationRecord({ date: '2026-10-01T00:00:00Z', score: 80 }, 'user-A');
    const rows = await fetchSimulationLedger('user-A', 1);
    expect(rows.map((r) => r.score)).toEqual([80]);
  });

  it('the legacy unscoped ledger is claimed only by its own account', async () => {
    idbMem.set(LEGACY_LEDGER_KEY, [{ id: 'old', date: '2026-08-01T00:00:00Z', score: 66 }]);
    const rows = await fetchSimulationLedger('user-A', 20, { claimLegacy: true });
    expect(rows.map((r) => r.id)).toEqual(['old']);
    expect(idbMem.has(LEGACY_LEDGER_KEY)).toBe(false);
  });

  it('an unattributable legacy ledger is dropped, never shown', async () => {
    idbMem.set(LEGACY_LEDGER_KEY, [{ id: 'old', date: '2026-08-01T00:00:00Z', score: 66 }]);
    expect(await fetchSimulationLedger('user-B', 20, { claimLegacy: false })).toEqual([]);
    expect(idbMem.has(LEGACY_LEDGER_KEY)).toBe(false);
  });

  it('deletes one record, purges one account, drops the legacy key', async () => {
    const { id } = await saveSimulationRecord({ date: '2026-10-01T00:00:00Z', score: 70 }, 'user-A');
    await saveSimulationRecord({ date: '2026-10-02T00:00:00Z', score: 72 }, 'user-A');
    await deleteSimulationRecord('user-A', id);
    expect(await fetchSimulationLedger('user-A')).toHaveLength(1);

    await purgeSimulationLedger('user-A');
    expect(await fetchSimulationLedger('user-A')).toEqual([]);

    idbMem.set(LEGACY_LEDGER_KEY, [{ id: 'x' }]);
    await dropLegacyLedger();
    expect(idbMem.has(LEGACY_LEDGER_KEY)).toBe(false);
  });
});
