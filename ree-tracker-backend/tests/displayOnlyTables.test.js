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
    // selfReportSignals reads the topics flagged "to improve" for the study
    // planner only (the test below pins who may require it).
    outsideScore: ['routes/outsideScoreRoutes.js', 'services/selfReportSignals.js'],
    // selfReportSignals reads the learner's own topic ratings for the planner only.
    syllabusProgress: ['routes/syllabusRoutes.js', 'services/selfReportSignals.js'],
    // The notebook's reads live in services/mistakeList.js (shared with the
    // Today loop, which only picks which questions to practise).
    mistakeTag: ['routes/mistakeRoutes.js', 'services/mistakeList.js'],
    userNote: ['routes/noteRoutes.js'],
    focusBlock: ['services/focusTime.js'],
    // Printed paper sets and their scanned sheets: scores on the learner's
    // own printouts, marked from photos, never θ, readiness or the rankings.
    // Key dates and rest days shape the study plan's days, and nothing else.
    keyDate: ['routes/keyDateRoutes.js', 'services/planCalendar.js'],
    // Sets to finish and personal links (CELE round): display only, every way.
    practiceSet: ['routes/practiceSetRoutes.js'],
    userLink: ['routes/userLinkRoutes.js'],
    printedSet: ['routes/printedSetRoutes.js'],
    scannedSheet: ['routes/printedSetRoutes.js'],
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

    // Self-reported signals may raise a topic in the study plan, and nowhere
    // else: only the planner route may require the service that reads them,
    // and the plan engine never reaches the database itself.
    for (const name of ['selfReportSignals', 'planCalendar']) {
        it(`${name} is required only by the planner route`, () => {
            const re = new RegExp(`require\\(['"][^'"]*/${name}['"]\\)`);
            const users = sourceFiles(SRC)
                .filter((file) => re.test(readFileSync(file, 'utf8')))
                .map((file) => relative(SRC, file).replace(/\\/g, '/'));
            expect(users).toEqual(['routes/plannerRoutes.js']);
        });
    }

    it('engine/plan.js stays pure', () => {
        expect(readFileSync(join(SRC, 'engine/plan.js'), 'utf8')).not.toMatch(/config\/db|@prisma/);
    });

    it('would catch an engine reading the table', () => {
        expect(usesTable('const rows = await tx.outsideScore.findMany({})', 'outsideScore')).toBe(true);
        expect(usesTable('SELECT * FROM "OutsideScore"', 'outsideScore')).toBe(true);
        expect(usesTable('const outsideScores = [];', 'outsideScore')).toBe(false);
    });
});
