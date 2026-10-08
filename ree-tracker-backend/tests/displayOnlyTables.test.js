import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Self-reported tables are DISPLAY ONLY. Outside scores are other people's
// questions on other people's keys, entered by hand; if they reached θ, the
// forecast, readiness or the rankings, a typo (or a generous entry) would
// move numbers the app presents as measured. The product decision
// (2026-10-08): show them beside the app's own mocks, never inside them.
//
// This pins it statically: each table may be touched only by its own route
// file. A service that joins one into an engine fails here, not in a review.

const SRC = resolve(__dirname, '..', 'src');

// model accessor / SQL table name -> the only files allowed to use it
const DISPLAY_ONLY = {
    outsideScore: ['routes/outsideScoreRoutes.js'],
    syllabusProgress: ['routes/syllabusRoutes.js'],
};

function sourceFiles(dir) {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return sourceFiles(path);
        return /\.js$/.test(name) ? [path] : [];
    });
}

const usesTable = (text, accessor) => {
    const model = accessor[0].toUpperCase() + accessor.slice(1);
    // prisma.outsideScore / tx.outsideScore / any client alias, and raw SQL "OutsideScore".
    return new RegExp(`\\.${accessor}\\b|"${model}"`).test(text);
};

describe('display-only tables', () => {
    it('finds the backend source tree', () => {
        expect(sourceFiles(SRC).length).toBeGreaterThan(50);
    });

    for (const [accessor, allowed] of Object.entries(DISPLAY_ONLY)) {
        it(`${accessor} is read and written only by ${allowed.join(', ')}`, () => {
            const users = sourceFiles(SRC)
                .filter((file) => usesTable(readFileSync(file, 'utf8'), accessor))
                .map((file) => relative(SRC, file).replace(/\\/g, '/'));
            expect(users.sort()).toEqual([...allowed].sort());
        });
    }

    it('would catch an engine reading the table', () => {
        expect(usesTable('const rows = await tx.outsideScore.findMany({})', 'outsideScore')).toBe(true);
        expect(usesTable('SELECT * FROM "OutsideScore"', 'outsideScore')).toBe(true);
        expect(usesTable('const outsideScores = [];', 'outsideScore')).toBe(false);
    });
});
