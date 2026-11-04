import { describe, it, expect } from 'vitest';

// A backup restores records by sending exported rows back through the routes that
// made them. So a row as the export returns it, with its extra columns, must pass each
// route's own schema. If a schema tightens, this says so before a restore fails for real.

const { noteSchema, mistakeTagSchema } = require('../src/schemas/notebookSchemas');
const { syllabusProgressSchema } = require('../src/schemas/syllabusSchemas');
const { userSubtopicSchema } = require('../src/schemas/subtopicSchemas');
const { practiceSetCreateSchema, userLinkCreateSchema } = require('../src/schemas/setsAndLinksSchemas');
const { keyDateCreateSchema } = require('../src/schemas/keyDateSchemas');
const { outsideScoreCreateSchema } = require('../src/schemas/outsideScoreSchemas');
const { drawPrefsSchema } = require('../src/schemas/userSchemas');

const ID = '11111111-1111-4111-8111-111111111111';
const CONFIDENT = require('@ree/shared').SELF_CONFIDENCE_LEVELS[0];
const STAMPS = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' };

const passes = (schema, row) => {
    const out = schema.safeParse(row);
    expect(out.success, JSON.stringify(out.error?.flatten?.().fieldErrors)).toBe(true);
    return out.data;
};

describe('an exported row, sent back through its route', () => {
    it('a note', () => {
        passes(noteSchema, { body: 'V = IR' });
    });

    it('a mistake tag', () => {
        passes(mistakeTagSchema, { cause: null, resolved: true });
    });

    it('a syllabus tick, all its columns', () => {
        const out = passes(syllabusProgressSchema, {
            id: ID, topicId: 't1', read: true, watched: false, drilled: false, startedOn: '2026-10-01', finishedOn: null, note: null, confidence: CONFIDENT, dread: null, ...STAMPS,
        });
        expect(out.id).toBeUndefined();
        expect(out.confidence).toBe(CONFIDENT);
    });

    it('a subtopic', () => {
        passes(userSubtopicSchema, { id: 'x', topicId: 't1', subtopicId: null, name: 'Mine', hidden: false, done: true, doneOn: '2026-10-02', sortOrder: 2, ...STAMPS });
    });

    it('a practice set', () => {
        passes(practiceSetCreateSchema, { id: ID, collection: 'Reviewer', title: 'Set 1', subject: 'EE', status: 'todo', doneOn: null, outsideScoreId: null, sortOrder: 0, ...STAMPS });
    });

    it('a link', () => {
        passes(userLinkCreateSchema, { id: ID, title: 'Notes', url: 'https://example.com', subject: 'EE', topicId: null, pinned: false, note: null, ...STAMPS });
    });

    it('a key date', () => {
        passes(keyDateCreateSchema, { id: ID, kind: 'preboard', title: 'Mock', startsOn: '2026-12-01', endsOn: null, subject: null, topicIds: [], note: null, ...STAMPS });
    });

    it('an outside score', () => {
        passes(outsideScoreCreateSchema, {
            id: ID, title: 'Preboard', source: null, takenOn: '2026-10-05', subject: 'EE', score: 40, total: 50, note: null, parts: null, minutesUsed: null, guessed: null, skipped: null, improveTopicIds: [], retestOfId: null, ...STAMPS,
        });
    });

    it('how mocks are picked', () => {
        passes(drawPrefsSchema, { drawMode: 'even', ownCounts: {} });
    });
});
