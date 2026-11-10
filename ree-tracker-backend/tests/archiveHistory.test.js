import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';

// scripts/archiveHistory.js: what would go, the archive, then a delete of
// exactly what the archive holds, refused unless the file checks out.
const { run, readArchive } = require('../scripts/archiveHistory');

const VERSIONS = [
    { id: 'v1', questionId: 'q1', action: 'EDITED', snapshot: { text: 'old wording' }, createdAt: new Date('2026-07-01') },
    { id: 'v2', questionId: null, reviewId: 'r1', action: 'SUBMITTED', snapshot: { text: 'draft' }, createdAt: new Date('2026-07-02') },
];
const REVIEWS = [{ id: 'r1', status: 'APPROVED', text: 'approved copy', options: ['a', 'b'], reviewedAt: new Date('2026-07-03') }];

function fakePrisma() {
    const byId = (rows) => ({
        findMany: vi.fn(async ({ where }) => rows.filter((r) => where.id.in.includes(r.id))),
        deleteMany: vi.fn(async ({ where }) => ({ count: rows.filter((r) => where.id.in.includes(r.id)).length })),
    });
    return {
        $queryRawUnsafe: vi.fn(async (sql, value) => {
            if (sql.includes('FROM "QuestionVersion"')) { expect(value).toBe(2); return VERSIONS.map(({ id }) => ({ id })); }
            expect(value).toBe(30);
            return REVIEWS.map(({ id }) => ({ id }));
        }),
        questionVersion: byId(VERSIONS),
        questionPendingReview: byId(REVIEWS),
    };
}

let dir;
let file;
const quiet = () => {};
beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ree-history-'));
    file = path.join(dir, 'history.jsonl.gz');
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('archiveHistory', () => {
    it('with no flags, counts and writes nothing', async () => {
        const prisma = fakePrisma();
        const { counts } = await run([], prisma, quiet);
        expect(counts).toEqual({ QuestionVersion: 2, QuestionPendingReview: 1 });
        expect(fs.readdirSync(dir)).toEqual([]);
        expect(prisma.questionVersion.deleteMany).not.toHaveBeenCalled();
    });

    it('archives every row whole, with a manifest, and never overwrites one', async () => {
        const prisma = fakePrisma();
        const { manifest } = await run([`--archive=${file}`], prisma, quiet);
        expect(manifest.counts).toEqual({ QuestionVersion: 2, QuestionPendingReview: 1 });
        const lines = zlib.gunzipSync(fs.readFileSync(file)).toString().trim().split('\n').map((l) => JSON.parse(l));
        expect(lines[0]).toMatchObject({ archive: 'ree-question-history', keep: 2, days: 30 });
        expect(lines.slice(1).map((l) => [l.table, l.row.id])).toEqual([['QuestionVersion', 'v1'], ['QuestionVersion', 'v2'], ['QuestionPendingReview', 'r1']]);
        expect(lines[1].row.snapshot).toEqual({ text: 'old wording' });
        expect(JSON.parse(fs.readFileSync(`${file}.json`, 'utf8'))).toMatchObject({ counts: manifest.counts, sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
        expect(prisma.questionVersion.deleteMany).not.toHaveBeenCalled();
        await expect(run([`--archive=${file}`], fakePrisma(), quiet)).rejects.toThrow(/already exists/);
    });

    it('deletes exactly the archived ids, only with --confirm=TRIM', async () => {
        await run([`--archive=${file}`], fakePrisma(), quiet);
        const prisma = fakePrisma();
        await expect(run(['--delete', `--archive=${file}`], prisma, quiet)).rejects.toThrow(/--confirm=TRIM/);
        const { deleted } = await run(['--delete', `--archive=${file}`, '--confirm=TRIM'], prisma, quiet);
        expect(deleted).toEqual({ QuestionVersion: 2, QuestionPendingReview: 1 });
        expect(prisma.questionVersion.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['v1', 'v2'] } } });
        expect(prisma.questionPendingReview.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['r1'] } } });
        // The ids come from the file, not the rules again.
        expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    it('refuses a file that changed since it was written, or lost its manifest', async () => {
        await run([`--archive=${file}`], fakePrisma(), quiet);
        fs.appendFileSync(file, 'x');
        await expect(readArchive(file)).rejects.toThrow(/SHA-256/);
        fs.rmSync(`${file}.json`);
        const prisma = fakePrisma();
        await expect(run(['--delete', `--archive=${file}`, '--confirm=TRIM'], prisma, quiet)).rejects.toThrow(/\.json/);
        expect(prisma.questionVersion.deleteMany).not.toHaveBeenCalled();
    });

    it('refuses an archive whose rows don’t match its count', async () => {
        await run([`--archive=${file}`], fakePrisma(), quiet);
        const manifest = JSON.parse(fs.readFileSync(`${file}.json`, 'utf8'));
        fs.writeFileSync(`${file}.json`, JSON.stringify({ ...manifest, counts: { ...manifest.counts, QuestionVersion: 5 } }));
        await expect(readArchive(file)).rejects.toThrow(/holds 2 QuestionVersion rows, its \.json says 5/);
    });
});
