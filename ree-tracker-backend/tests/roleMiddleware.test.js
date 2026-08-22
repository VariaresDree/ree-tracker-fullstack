import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The admin gate used to exist TWICE — middlewares/adminMiddleware.js (60s
// cached, unbounded Map) and middlewares/roleMiddleware.js (uncached, fresh
// query per request). Same rule, different staleness, and only one of them
// could be fixed at a time. These tests pin the consolidated behaviour,
// including the isAdminUser predicate that POST /api/questions needs in order
// to BRANCH on clearance (routing non-admin submissions into the pending queue)
// instead of being all-or-nothing gated.
//
// Following the pattern established in reviewServiceBulkRetry.test.js:
// `../src/config/db` exports a shared PrismaClient singleton that vi.mock
// cannot cleanly swap out from under a plain require() in a CommonJS module, so
// we spy on the singleton's methods instead. No Postgres connection is opened
// because every call is intercepted.
const prisma = require('../src/config/db');
const { requireAdmin, isAdminUser, invalidateRole } = require('../src/middlewares/roleMiddleware');
const adminMiddleware = require('../src/middlewares/adminMiddleware');

let findUnique;

beforeEach(() => {
    findUnique = vi.spyOn(prisma.user, 'findUnique');
});

afterEach(() => {
    vi.restoreAllMocks();
});

async function run(mw, userId) {
    const req = { user: userId ? { id: userId } : undefined };
    const res = {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
    };
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    return { res, nextCalled };
}

describe('isAdminUser', () => {
    it('is true for an ADMIN role', async () => {
        findUnique.mockResolvedValue({ role: 'ADMIN' });
        expect(await isAdminUser('admin-1')).toBe(true);
    });

    it('is false for a normal user', async () => {
        findUnique.mockResolvedValue({ role: 'USER' });
        expect(await isAdminUser('user-1')).toBe(false);
    });

    it('is false for an unknown user, without throwing', async () => {
        findUnique.mockResolvedValue(null);
        expect(await isAdminUser('ghost-1')).toBe(false);
    });

    it('is false for a missing id, without querying', async () => {
        expect(await isAdminUser(undefined)).toBe(false);
        expect(findUnique).not.toHaveBeenCalled();
    });

    it('caches, so an admin burst does not re-query on every request', async () => {
        findUnique.mockResolvedValue({ role: 'ADMIN' });
        await isAdminUser('cached-1');
        await isAdminUser('cached-1');
        await isAdminUser('cached-1');
        expect(findUnique).toHaveBeenCalledTimes(1);
    });

    it('re-reads after an explicit invalidation', async () => {
        findUnique.mockResolvedValue({ role: 'ADMIN' });
        expect(await isAdminUser('demoted-1')).toBe(true);

        invalidateRole('demoted-1');
        findUnique.mockResolvedValue({ role: 'USER' });
        expect(await isAdminUser('demoted-1')).toBe(false);
    });
});

describe('requireAdmin', () => {
    it('calls next() for an admin', async () => {
        findUnique.mockResolvedValue({ role: 'ADMIN' });
        const { nextCalled } = await run(requireAdmin, 'mw-admin');
        expect(nextCalled).toBe(true);
    });

    it('403s a non-admin', async () => {
        findUnique.mockResolvedValue({ role: 'USER' });
        const { res, nextCalled } = await run(requireAdmin, 'mw-user');
        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(403);
    });

    it('401s when there is no auth context', async () => {
        const { res, nextCalled } = await run(requireAdmin, undefined);
        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);
    });

    it('fails CLOSED when the role lookup throws', async () => {
        findUnique.mockRejectedValue(new Error('db down'));
        const { res, nextCalled } = await run(requireAdmin, 'mw-error');
        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(500);
    });
});

describe('adminMiddleware', () => {
    it('is an alias for the same gate, not a second implementation', async () => {
        findUnique.mockResolvedValue({ role: 'USER' });
        const { res, nextCalled } = await run(adminMiddleware, 'alias-user');
        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(403);
    });
});
