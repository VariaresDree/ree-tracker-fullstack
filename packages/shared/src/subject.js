// Subject naming — the single definition, shared by client and server.
//
// The question bank stores several historical spellings per subject. A canonical
// module for this already existed on the backend (src/utils/subject.js) and its
// own header claimed it "replaces the three divergent copies" — but EIGHT ad-hoc
// reimplementations survived across both packages, two of which normalise in the
// OPPOSITE direction ('Math' vs 'Mathematics'):
//
//   metadataRoutes.js:24   -> 'Math'      (plus substring matching on 'Sciences')
//   analyticsRoutes.js:52   inline, misses the long ESAS/EE spellings entirely
//   questionRoutes.js:22    hand-written `in:` arrays duplicating SUBJECT_VARIANTS
//   irtMath.js:41 (client), battleGrades.js:20, useSimulatorEngine.js:412,
//   LibraryOverview.jsx:428, HeatmapChart.jsx:93  -> all 'Math'
//
// analyticsDeepRoutes.js exists partly to paper over the resulting split radar
// rows. Two opposing canonical forms, chosen per file, is the actual bug.
//
// Canonical form is 'Mathematics' | 'ESAS' | 'EE'. toDisplaySubject gives the
// short label the UI wants, so display shortening is a deliberate, named step
// rather than an inline ternary re-invented in five components.

'use strict';

const SUBJECT_CANONICAL = {
    math: 'Mathematics',
    mathematics: 'Mathematics',
    esas: 'ESAS',
    'engineering sciences and allied subjects': 'ESAS',
    ee: 'EE',
    'electrical engineering': 'EE',
    'electrical engineering professional subjects': 'EE',
};

// Every stored spelling per canonical subject — used to build WHERE filters.
const SUBJECT_VARIANTS = {
    Mathematics: ['Math', 'Mathematics'],
    ESAS: ['ESAS', 'Engineering Sciences and Allied Subjects'],
    EE: ['EE', 'Electrical Engineering', 'Electrical Engineering Professional Subjects'],
};

// Short labels for UI surfaces that need to fit a chip or an axis tick.
const SUBJECT_DISPLAY = {
    Mathematics: 'Math',
    ESAS: 'ESAS',
    EE: 'EE',
};

/** The three canonical subjects, in PRC syllabus order. */
const CANONICAL_SUBJECTS = ['Mathematics', 'ESAS', 'EE'];

/**
 * Canonical subject name for analytics keys and storage. Unknown values pass
 * through unchanged; falsy becomes 'General' (matches prior telemetry behaviour).
 */
function normalizeSubject(s) {
    if (!s) return 'General';
    const norm = String(s).trim().toLowerCase();
    return SUBJECT_CANONICAL[norm] || s;
}

/**
 * Short display label. Use this instead of `s === 'Mathematics' ? 'Math' : s`,
 * which was written out by hand in five different components.
 */
function toDisplaySubject(s) {
    const canonical = normalizeSubject(s);
    return SUBJECT_DISPLAY[canonical] || canonical;
}

/**
 * Prisma filter matching all stored spellings for a subject. Returns undefined
 * for 'All'/empty (no subject constraint). Backend-only in practice, but it
 * lives here so the variant table has exactly one owner.
 */
function getSubjectFilter(subjectStr) {
    if (!subjectStr || subjectStr === 'All') return undefined;
    const canonical = normalizeSubject(subjectStr);
    const variants = SUBJECT_VARIANTS[canonical];
    return variants ? { in: variants } : subjectStr;
}

module.exports = {
    normalizeSubject,
    toDisplaySubject,
    getSubjectFilter,
    SUBJECT_CANONICAL,
    SUBJECT_VARIANTS,
    SUBJECT_DISPLAY,
    CANONICAL_SUBJECTS,
};
