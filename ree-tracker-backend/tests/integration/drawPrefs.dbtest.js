import { describe, it, expect, afterAll, beforeEach } from 'vitest';

// The column against a real Postgres: a learner's choice saves and reads back,
// and starts out null, which the app reads as an even spread.

const prisma = require('../../src/config/db');

const USER = 'draw-prefs-user';

beforeEach(async () => {
    await prisma.user.deleteMany({ where: { id: USER } });
    await prisma.user.create({ data: { id: USER, email: `${USER}@example.com` } });
});

afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: USER } });
    await prisma.$disconnect();
});

describe('User.drawPrefs', () => {
    const read = () => prisma.user.findUnique({ where: { id: USER }, select: { drawPrefs: true } });

    it('starts null', async () => {
        expect((await read()).drawPrefs).toBeNull();
    });

    it('saves and reads back whole', async () => {
        const prefs = { drawMode: 'own', ownCounts: { EE: { 'Electrical System & Illumination Design': 12 } } };
        await prisma.user.update({ where: { id: USER }, data: { drawPrefs: prefs } });
        expect((await read()).drawPrefs).toEqual(prefs);
    });
});
