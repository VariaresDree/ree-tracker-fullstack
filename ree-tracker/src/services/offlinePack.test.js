// Unit tests for the offline-pack selector. This is the read path that backs
// offline Active Review + mock exams: given a cached pack, it must return the
// right subject/subtopic slice (with subject-alias canonicalisation) so an
// offline session is indistinguishable from an online one.

import { describe, it, expect } from 'vitest';
import { selectFromPack, canonicalSubject } from './offlinePack.js';

const pack = {
    version: 1,
    fetchedAt: Date.now(),
    subjects: {
        Mathematics: [
            { id: 'm1', subject: 'Mathematics', subtopic: 'Algebra', answer: '4' },
            { id: 'm2', subject: 'Mathematics', subtopic: 'Calculus', answer: '0' },
        ],
        ESAS: [
            { id: 's1', subject: 'ESAS', subtopic: 'Chemistry', answer: 'H2O' },
        ],
        EE: [
            { id: 'e1', subject: 'EE', subtopic: 'Circuits', answer: 'Ohm' },
            { id: 'e2', subject: 'EE', subtopic: 'Machines', answer: 'Torque' },
            { id: 'e3', subject: 'EE', subtopic: 'Circuits', answer: 'Kirchhoff' },
        ],
    },
};

describe('canonicalSubject', () => {
    it('maps aliases to canonical subject names', () => {
        expect(canonicalSubject('Math')).toBe('Mathematics');
        expect(canonicalSubject('electrical engineering')).toBe('EE');
        expect(canonicalSubject('ESAS')).toBe('ESAS');
    });
});

describe('selectFromPack', () => {
    it('returns a full subject slice (answers intact for offline grading)', () => {
        const out = selectFromPack(pack, 'EE', 'All');
        expect(out.map((q) => q.id)).toEqual(['e1', 'e2', 'e3']);
        expect(out.every((q) => typeof q.answer === 'string')).toBe(true);
    });

    it('resolves subject aliases', () => {
        expect(selectFromPack(pack, 'Math', 'All').map((q) => q.id)).toEqual(['m1', 'm2']);
    });

    it('filters by subtopic case-insensitively', () => {
        expect(selectFromPack(pack, 'EE', 'circuits').map((q) => q.id)).toEqual(['e1', 'e3']);
    });

    it('spans every subject when subject is "All"', () => {
        const out = selectFromPack(pack, 'All', 'All');
        expect(out).toHaveLength(6);
        expect(new Set(out.map((q) => q.subject))).toEqual(new Set(['Mathematics', 'ESAS', 'EE']));
    });

    it('caps to the requested limit', () => {
        expect(selectFromPack(pack, 'All', 'All', 2)).toHaveLength(2);
    });

    it('returns [] for an empty/absent pack', () => {
        expect(selectFromPack(null, 'EE')).toEqual([]);
        expect(selectFromPack({ subjects: {} }, 'EE')).toEqual([]);
    });
});
