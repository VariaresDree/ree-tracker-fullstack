import { describe, it, expect, vi, afterEach } from 'vitest';
const { buildWeakSignals, mergeTopicSignals } = require('../src/services/topicSignals');
const prisma = require('../src/config/db');
const { recordDailySnapshot, snapshotFields } = require('../src/services/readinessSnapshots');

afterEach(() => vi.restoreAllMocks());

describe('mergeTopicSignals', () => {
    it('joins confident misses and median time onto each topic by canonical name', () => {
        const [row] = mergeTopicSignals(
            [{ topic: 'Protection', subject: 'EE', topicId: 't', attempts: 12, correct: 5, pMastery: 0.4, masteryN: 12, lastPracticedAt: new Date() }],
            [{ topic: ' protection ', confidentMisses: 6, medianMs: 200000 }],
        );
        expect(row).toMatchObject({ topic: 'Protection', subject: 'EE', confidentMisses: 6, medianMs: 200000, attempts: 12 });
        expect(row.masteryEffective).toBeCloseTo(0.4, 2);
    });
});

describe('buildWeakSignals', () => {
    const t = (topic, over) => ({ topic, subject: 'EE', topicId: null, attempts: 10, confidentMisses: 0, medianMs: 60000, ...over });

    it('a blind spot needs enough confident misses AND a real share of the answers', () => {
        const { blindSpots } = buildWeakSignals([
            t('A', { confidentMisses: 5, attempts: 10 }),   // 50% → in
            t('B', { confidentMisses: 2, attempts: 4 }),    // too few → out
            t('C', { confidentMisses: 3, attempts: 40 }),   // 7.5% → out
            t('D', { confidentMisses: 7, attempts: 20 }),   // 35% → in, more misses first
        ]);
        expect(blindSpots.map((b) => b.topic)).toEqual(['D', 'A']);
        expect(blindSpots[1]).toMatchObject({ confidentMisses: 5, rate: 0.5 });
    });

    it('a time sink is a median answer over three minutes, slowest first', () => {
        const { timeSinks } = buildWeakSignals([
            t('Fast', { medianMs: 90000 }),
            t('Slow', { medianMs: 200000 }),
            t('Slower', { medianMs: 260000 }),
            t('Unknown', { medianMs: null }),
        ]);
        expect(timeSinks).toEqual([
            expect.objectContaining({ topic: 'Slower', medianSecs: 260 }),
            expect.objectContaining({ topic: 'Slow', medianSecs: 200 }),
        ]);
    });
});

describe('daily readiness snapshot', () => {
    const payload = { score: 54, breakdown: { topicCoverage: 61, accuracyRate: 58, consistency: 40, blindSpotRatio: 12 } };

    it('maps the readiness payload onto the snapshot columns', () => {
        expect(snapshotFields(payload, 0.3)).toEqual({ score: 54, topicCoverage: 61, accuracyRate: 58, theta: 0.3, consistency: 40, blindSpotRatio: 12 });
    });

    it('creates the first snapshot of a Manila day, and updates it for the rest of that day', async () => {
        const create = vi.spyOn(prisma.readinessSnapshot, 'create').mockResolvedValue({});
        const update = vi.spyOn(prisma.readinessSnapshot, 'update').mockResolvedValue({});
        const find = vi.spyOn(prisma.readinessSnapshot, 'findFirst');

        // Yesterday (Manila) → new row today.
        find.mockResolvedValueOnce({ id: 'old', createdAt: new Date('2026-10-01T10:00:00Z') });
        await recordDailySnapshot('u1', payload, 0.3, new Date('2026-10-02T02:00:00Z'));
        expect(create).toHaveBeenCalledTimes(1);

        // 23:00 UTC on 1 Oct is already 2 Oct in Manila → same day → update.
        find.mockResolvedValueOnce({ id: 'today', createdAt: new Date('2026-10-01T23:00:00Z') });
        await recordDailySnapshot('u1', payload, 0.3, new Date('2026-10-02T09:00:00Z'));
        expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'today' } }));
    });

    it('never throws', async () => {
        vi.spyOn(prisma.readinessSnapshot, 'findFirst').mockRejectedValue(new Error('db down'));
        await expect(recordDailySnapshot('u1', payload, 0)).resolves.toBe(false);
    });
});
