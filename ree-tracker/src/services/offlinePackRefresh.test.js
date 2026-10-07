import { describe, it, expect, vi, beforeEach } from 'vitest';

// The phone header and the Account page each mount an offline-status badge,
// and each badge refreshes a stale pack on mount. Two concurrent refreshes
// would download the whole pack twice; they share one build instead.
let release;
const getOfflinePack = vi.fn(() => new Promise((resolve) => { release = resolve; }));
vi.mock('./offlinePack', async (orig) => ({
    ...(await orig()),
    getOfflinePack: (...a) => getOfflinePack(...a),
    getOfflinePackMeta: vi.fn(async () => ({ exists: false, stale: true, total: 0 })),
    writeOfflinePack: vi.fn(async () => {}),
}));

const { refreshOfflinePack } = await import('./dbQueries');

beforeEach(() => { getOfflinePack.mockClear(); });

describe('refreshOfflinePack', () => {
    it('concurrent callers share one build', async () => {
        const a = refreshOfflinePack();
        const b = refreshOfflinePack();
        expect(a).toBe(b);
        expect(getOfflinePack).toHaveBeenCalledTimes(1);
        release({ subjects: {}, checksums: {} });
        await a.catch(() => {});
    });

    it('a later call after the first finished starts a fresh build', async () => {
        const first = refreshOfflinePack();
        release({ subjects: {}, checksums: {} });
        await first.catch(() => {});
        const second = refreshOfflinePack();
        expect(second).not.toBe(first);
        expect(getOfflinePack).toHaveBeenCalledTimes(2);
        release({ subjects: {}, checksums: {} });
        await second.catch(() => {});
    });
});
