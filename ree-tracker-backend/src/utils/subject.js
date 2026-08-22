// src/utils/subject.js
// Re-export shim. The subject naming rules now live in @ree/shared so the web
// client and the API cannot drift — there were EIGHT ad-hoc reimplementations
// across the two packages, two of which normalised in the OPPOSITE direction
// ('Math' vs 'Mathematics'). Kept so existing imports keep resolving.
const {
    normalizeSubject,
    toDisplaySubject,
    getSubjectFilter,
    SUBJECT_CANONICAL,
    SUBJECT_VARIANTS,
    SUBJECT_DISPLAY,
    CANONICAL_SUBJECTS,
} = require('@ree/shared');

module.exports = {
    normalizeSubject,
    toDisplaySubject,
    getSubjectFilter,
    SUBJECT_CANONICAL,
    SUBJECT_VARIANTS,
    SUBJECT_DISPLAY,
    CANONICAL_SUBJECTS,
};
