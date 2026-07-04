// src/utils/subject.js
// Single source of truth for subject naming. The question bank stores several
// historical spellings per subject; canonicalise for analytics keys, and build
// a Prisma `in` filter that matches every spelling for query WHEREs. Replaces
// the three divergent copies previously in questionPool / telemetryService /
// examRoutes.

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

// Canonical subject name for analytics keys. Unknown values pass through; falsy
// becomes 'General' (matches the previous telemetry behaviour).
function normalizeSubject(s) {
    if (!s) return 'General';
    const norm = String(s).trim().toLowerCase();
    return SUBJECT_CANONICAL[norm] || s;
}

// Prisma filter matching all stored spellings for a subject. Returns undefined
// for 'All'/empty (no subject constraint).
function getSubjectFilter(subjectStr) {
    if (!subjectStr || subjectStr === 'All') return undefined;
    const canonical = normalizeSubject(subjectStr);
    const variants = SUBJECT_VARIANTS[canonical];
    return variants ? { in: variants } : subjectStr;
}

module.exports = { normalizeSubject, getSubjectFilter, SUBJECT_CANONICAL, SUBJECT_VARIANTS };
