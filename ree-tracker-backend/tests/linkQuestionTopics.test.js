import { describe, it, expect } from 'vitest';
const { planTopicLinks, parseArgs, LABEL_REMAPS } = require('../scripts/linkQuestionTopics');
const { normKey, buildResolverIndex } = require('../src/services/topicResolver');

const topic = (subject, name, extra = {}) => ({ id: `t-${normKey(name)}`, subject, name, normKey: normKey(name), aliases: [], active: true, ...extra });

// Shaped like production on 2026-10-03: the TOS editor manages curriculum-course
// names, and untagged questions carry those labels (plus two the stale Library
// dropdown invented).
const index = buildResolverIndex([
    topic('EE', 'Electric Circuits 1'),
    topic('EE', 'Electrical Transient Analysis', { aliases: ['Transients'] }),
    topic('Mathematics', 'Calculus 1'),
    topic('Mathematics', 'Algebra'),
    topic('Mathematics', 'Plane Geometry', { active: false }),
]);

describe('planTopicLinks', () => {
    it('links a label that matches an existing topic exactly, within its canonical subject', () => {
        const { links, unmatched } = planTopicLinks(index, [
            { subject: 'EE', subtopic: 'Electric Circuits 1', count: 61 },
            { subject: 'Math', subtopic: 'Calculus 1', count: 70 }, // 'Math' is canonicalised to Mathematics
        ]);
        expect(unmatched).toEqual([]);
        expect(links).toEqual([
            { subject: 'EE', subtopic: 'Electric Circuits 1', count: 61, topicId: 't-electric circuits 1', topicName: 'Electric Circuits 1', renamed: false },
            { subject: 'Math', subtopic: 'Calculus 1', count: 70, topicId: 't-calculus 1', topicName: 'Calculus 1', renamed: false },
        ]);
    });

    it('matches by normKey and alias, and flags the label rewrite', () => {
        const { links } = planTopicLinks(index, [
            { subject: 'EE', subtopic: ' electric circuits 1 ', count: 2 },
            { subject: 'EE', subtopic: 'Transients', count: 3 },
        ]);
        expect(links.map((l) => [l.topicName, l.renamed])).toEqual([
            ['Electric Circuits 1', true],
            ['Electrical Transient Analysis', true],
        ]);
    });

    it('never links across subjects, even when the label is unambiguous elsewhere', () => {
        const { links, unmatched } = planTopicLinks(index, [{ subject: 'EE', subtopic: 'Algebra', count: 4 }]);
        expect(links).toEqual([]);
        expect(unmatched).toEqual([{ subject: 'EE', subtopic: 'Algebra', count: 4 }]);
    });

    it('never links to an inactive topic', () => {
        const { links } = planTopicLinks(index, [{ subject: 'Mathematics', subtopic: 'Plane Geometry', count: 9 }]);
        expect(links).toEqual([]);
    });

    it('reports unmatched labels (largest first) instead of creating topics for them', () => {
        const { links, unmatched } = planTopicLinks(index, [
            { subject: 'EE', subtopic: 'AC Impedance', count: 5 },
            { subject: 'EE', subtopic: 'Transient Response', count: 35 },
            { subject: 'EE', subtopic: '   ', count: 1 },
        ], {});
        expect(links).toEqual([]);
        expect(unmatched).toEqual([
            { subject: 'EE', subtopic: 'Transient Response', count: 35 },
            { subject: 'EE', subtopic: 'AC Impedance', count: 5 },
            { subject: 'EE', subtopic: '   ', count: 1 },
        ]);
    });

    it('only ever points at ids of the existing rows it was given', () => {
        const { links } = planTopicLinks(index, [
            { subject: 'EE', subtopic: 'Electric Circuits 1', count: 1 },
            { subject: 'Math', subtopic: 'Algebra', count: 1 },
        ]);
        expect(links.map((l) => l.topicId)).toEqual(['t-electric circuits 1', 't-algebra']);
    });
});

describe('planTopicLinks — reviewed remaps for labels that match nothing', () => {
    const remaps = { EE: { 'Transient Response': 'Electrical Transient Analysis', 'AC Impedance': 'Electric Circuits 1' } };

    it('links a remapped label to the named EXISTING topic and flags the rewrite', () => {
        const { links, unmatched } = planTopicLinks(index, [{ subject: 'EE', subtopic: 'transient response ', count: 35 }], remaps);
        expect(unmatched).toEqual([]);
        expect(links).toEqual([{
            subject: 'EE', subtopic: 'transient response ', count: 35,
            topicId: 't-electrical transient analysis', topicName: 'Electrical Transient Analysis', renamed: true, remapped: true,
        }]);
    });

    it('an exact match always wins over a remap', () => {
        const { links } = planTopicLinks(index, [{ subject: 'EE', subtopic: 'Electric Circuits 1', count: 2 }],
            { EE: { 'Electric Circuits 1': 'Electrical Transient Analysis' } });
        expect(links[0]).toMatchObject({ topicName: 'Electric Circuits 1', renamed: false });
        expect(links[0].remapped).toBeUndefined();
    });

    it('leaves the group unmatched, naming the target, when the remap target no longer exists', () => {
        const { links, unmatched } = planTopicLinks(index, [{ subject: 'EE', subtopic: 'AC Impedance', count: 5 }],
            { EE: { 'AC Impedance': 'Electric Circuits 2' } }); // not in this index
        expect(links).toEqual([]);
        expect(unmatched).toEqual([{ subject: 'EE', subtopic: 'AC Impedance', count: 5, missingRemapTarget: 'Electric Circuits 2' }]);
    });

    it('never applies a remap across subjects', () => {
        const { links } = planTopicLinks(index, [{ subject: 'ESAS', subtopic: 'Transient Response', count: 1 }], remaps);
        expect(links).toEqual([]);
    });

    it('ships remaps for exactly the two labels the stale Library dropdown minted', () => {
        expect(LABEL_REMAPS).toEqual({
            EE: { 'Transient Response': 'Electrical Transient Analysis', 'AC Impedance': 'Electric Circuits 2' },
        });
    });
});

describe('parseArgs', () => {
    it('is a dry run unless --apply is passed', () => {
        expect(parseArgs(['node', 'script'])).toEqual({ apply: false });
        expect(parseArgs(['node', 'script', '--apply'])).toEqual({ apply: true });
    });
});
