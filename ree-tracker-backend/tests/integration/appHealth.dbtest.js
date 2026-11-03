import { describe, it, expect, afterAll, beforeEach } from 'vitest';

// The upserts and the groupBy against a real Postgres: a repeat adds to the
// same row, and a person's second report of a version isn't a second person.

const prisma = require('../../src/config/db');
const { recordErrors, recordVersion, healthSummary, dismissError } = require('../../src/services/appHealthService');

const USERS = ['health-a', 'health-b'];

beforeEach(async () => {
    await prisma.appError.deleteMany({});
    await prisma.appVersionSeen.deleteMany({ where: { userId: { in: USERS } } });
    await prisma.user.deleteMany({ where: { id: { in: USERS } } });
    await prisma.user.createMany({ data: USERS.map((id) => ({ id, email: `${id}@example.com` })) });
});

afterAll(async () => {
    await prisma.appError.deleteMany({});
    await prisma.user.deleteMany({ where: { id: { in: USERS } } });
    await prisma.$disconnect();
});

describe('app health', () => {
    it('counts people per version', async () => {
        await recordVersion('health-a', 'v1');
        await recordVersion('health-a', 'v1');
        await recordVersion('health-b', 'v1');
        await recordVersion('health-b', 'v2');
        const { versions } = await healthSummary();
        const people = Object.fromEntries(versions.map((v) => [v.version, v.people]));
        expect(people).toEqual({ v1: 2, v2: 1 });
    });

    it('adds repeats to one row, and a dismissed error comes back when it recurs', async () => {
        await recordErrors([{ message: 'Question 1 broke' }], 'client');
        await recordErrors([{ message: 'Question 2 broke', count: 4 }], 'client');
        let { errors } = await healthSummary();
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({ count: 5, message: 'Question 2 broke' });
        await dismissError(errors[0].id);
        await recordErrors([{ message: 'Question 3 broke' }], 'client');
        ({ errors } = await healthSummary());
        expect(errors).toHaveLength(1);
        expect(errors[0].count).toBe(1);
    });

    it('clears errors with no repeat in 60 days', async () => {
        await recordErrors([{ message: 'old' }], 'server');
        await prisma.appError.updateMany({ data: { lastSeenAt: new Date(Date.now() - 61 * 86_400_000) } });
        const { errors } = await healthSummary();
        expect(errors).toHaveLength(0);
    });
});
