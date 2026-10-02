// The device-local mock ledger is retired (mock history is served by the API);
// only its cleanup remains.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  del: async (k) => { idbMem.delete(k); },
}));

const { purgeSimulationLedger, dropLegacyLedger, LEGACY_LEDGER_KEY, ledgerKey } = await import('./simulationLedger');

beforeEach(() => idbMem.clear());

describe('retired simulation ledger cleanup', () => {
  it('purges one account and drops the legacy key, leaving other accounts alone', async () => {
    idbMem.set(ledgerKey('user-A'), [{ id: 'a' }]);
    idbMem.set(ledgerKey('user-B'), [{ id: 'b' }]);
    idbMem.set(LEGACY_LEDGER_KEY, [{ id: 'old' }]);

    await purgeSimulationLedger('user-A');
    await dropLegacyLedger();

    expect(idbMem.has(ledgerKey('user-A'))).toBe(false);
    expect(idbMem.has(LEGACY_LEDGER_KEY)).toBe(false);
    expect(idbMem.has(ledgerKey('user-B'))).toBe(true);
  });

  it('a missing uid purges nothing', async () => {
    idbMem.set(ledgerKey('user-A'), []);
    await purgeSimulationLedger(undefined);
    expect(idbMem.size).toBe(1);
  });
});
