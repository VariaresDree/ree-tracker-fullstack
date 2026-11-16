import { describe, it, expect } from 'vitest';

// Formula cards by topic (Library round, 2026-11-16): every data file in
// scripts/data/cards passes the API's own card rules, names only subtopics its
// topic has, and its committed migration is exactly what the data generates.

const fs = require('fs');
const path = require('path');
const { problemsIn, buildSql, dataFiles, load, migrationPath } = require('../scripts/cardsByTopic');

// The syllabus subtopics as seeded: ('Subject', 'Topic', 'Subtopic', order).
const SEED = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'migrations', '20261105000000_syllabus_subtopics', 'migration.sql'), 'utf8');
const syllabus = new Map();
for (const m of SEED.matchAll(/\(\s*'((?:[^']|'')+)'\s*,\s*'((?:[^']|'')+)'\s*,\s*'((?:[^']|'')+)'\s*,\s*\d+\s*\)/g)) {
    const [subject, topic, name] = [m[1], m[2], m[3]].map((x) => x.replace(/''/g, "'"));
    const key = `${subject}|${topic}`;
    if (!syllabus.has(key)) syllabus.set(key, new Set());
    syllabus.get(key).add(name.toLowerCase());
}

describe('formula cards by topic', () => {
    it('has data files to check', () => {
        expect(dataFiles()).toContain('mathematics/algebra');
    });

    for (const key of dataFiles()) {
        const data = load(key);
        describe(key, () => {
            it('passes the card rules', () => {
                expect(problemsIn(data)).toEqual([]);
            });

            it('names only subtopics its topic has', () => {
                const names = syllabus.get(`${data.subject}|${data.topic}`);
                expect(names, `${data.subject} › ${data.topic} is not in the syllabus seed`).toBeTruthy();
                for (const s of [...data.file.map((f) => f[1]), ...data.drafts.map((d) => d.subtopic)]) {
                    expect(names.has(s.toLowerCase()), s).toBe(true);
                }
            });

            it('its migration is what the data generates (run cardsByTopic.js --write)', () => {
                expect(fs.readFileSync(migrationPath(data), 'utf8').replace(/\r\n/g, '\n')).toBe(buildSql(data));
            });
        });
    }
});
