import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// The scheduled jobs' record (services/jobRuns.js) behind Admin › App health ›
// Scheduled jobs: each run is kept with what it did, and a job that hasn't run
// for two hours inside its hours reads as late.

const prisma = require('../src/config/db');
const { isLate, withJobRun, jobHealth } = require('../src/services/jobRuns');
const cronRoutes = require('../src/routes/cronRoutes');

const at = (iso) => new Date(iso);
afterEach(() => { vi.restoreAllMocks(); delete process.env.CRON_SECRET; });

describe('isLate', () => {
    it('reminders run every hour of the day: late after two hours without a run', () => {
        expect(isLate('reminders', at('2026-11-12T10:00:00Z'), at('2026-11-12T11:30:00Z'))).toBe(false);
        expect(isLate('reminders', at('2026-11-12T08:00:00Z'), at('2026-11-12T11:30:00Z'))).toBe(true);
        expect(isLate('reminders', null, at('2026-11-12T11:30:00Z'))).toBe(true);
    });

    it('tagging runs 06:00-23:00 Manila only: never late at night', () => {
        // 18:30 UTC is 02:30 Manila, outside its hours.
        expect(isLate('subtopic-tags', at('2026-11-12T15:15:00Z'), at('2026-11-12T18:30:00Z'))).toBe(false);
        expect(isLate('subtopic-tags', at('2026-11-12T09:15:00Z'), at('2026-11-12T12:30:00Z'))).toBe(true);
    });
});

describe('withJobRun', () => {
    it('records a run with what it returned', async () => {
        const create = vi.spyOn(prisma.jobRun, 'create').mockResolvedValue({});
        vi.spyOn(prisma.jobRun, 'deleteMany').mockResolvedValue({ count: 0 });
        const out = await withJobRun('reminders', async () => ({ candidates: 2, sent: 1, quiet: 1 }));
        expect(out).toEqual({ candidates: 2, sent: 1, quiet: 1 });
        expect(create.mock.calls[0][0].data).toMatchObject({ job: 'reminders', ok: true, summary: { candidates: 2, sent: 1, quiet: 1 }, error: null });
    });

    it('a run the AI cut short is a failed run; a throw is recorded and rethrown', async () => {
        const create = vi.spyOn(prisma.jobRun, 'create').mockResolvedValue({});
        vi.spyOn(prisma.jobRun, 'deleteMany').mockResolvedValue({ count: 0 });
        await withJobRun('subtopic-tags', async () => ({ batches: 0, stopped: 'exhausted' }), (o) => !o.stopped);
        expect(create.mock.calls[0][0].data.ok).toBe(false);
        await expect(withJobRun('reminders', async () => { throw new Error('db down'); })).rejects.toThrow('db down');
        expect(create.mock.calls[1][0].data).toMatchObject({ ok: false, error: 'db down' });
    });

    it('a record that can’t be written never breaks the job', async () => {
        vi.spyOn(prisma.jobRun, 'create').mockRejectedValue(new Error('no table'));
        expect(await withJobRun('reminders', async () => ({ sent: 0 }))).toEqual({ sent: 0 });
    });
});

describe('jobHealth', () => {
    it('gives each job its last run, last good run, the day’s counts and whether it is late', async () => {
        const now = at('2026-11-12T12:30:00Z');
        vi.spyOn(prisma.jobRun, 'findFirst').mockImplementation(async ({ where }) => (where.job === 'reminders'
            ? { startedAt: at('2026-11-12T12:05:00Z'), durationMs: 900, ok: true, summary: { sent: 1 }, error: null }
            : null));
        vi.spyOn(prisma.jobRun, 'count').mockResolvedValue(0);
        const jobs = await jobHealth(now);
        expect(jobs.map((j) => j.job)).toEqual(['reminders', 'subtopic-tags']);
        expect(jobs[0]).toMatchObject({ late: false, last: { ok: true, summary: { sent: 1 } } });
        expect(jobs[1]).toMatchObject({ late: true, last: null, lastOkAt: null });
    });
});

describe('POST /api/cron/reminders', () => {
    it('records the run', async () => {
        process.env.CRON_SECRET = 'a-long-random-secret-value';
        vi.spyOn(prisma.user, 'findMany').mockResolvedValue([]);
        const create = vi.spyOn(prisma.jobRun, 'create').mockResolvedValue({});
        vi.spyOn(prisma.jobRun, 'deleteMany').mockResolvedValue({ count: 0 });
        const app = express().use(express.json()).use('/api/cron', cronRoutes);
        const res = await request(app).post('/api/cron/reminders').set('x-cron-secret', 'a-long-random-secret-value');
        expect(res.status).toBe(200);
        expect(create.mock.calls[0][0].data).toMatchObject({ job: 'reminders', ok: true, summary: { candidates: 0, sent: 0, quiet: 0 } });
    });
});
