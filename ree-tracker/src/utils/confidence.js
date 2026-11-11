// src/utils/confidence.js
//
// A confidence nobody chose travels as no field at all. The server records a
// missing one as UNRATED (since 2026-11-11; before that, as MED), so a request
// never fails on a value an older server doesn't know, whichever deploys first.
export const confidenceField = (level) => (level && level !== 'UNRATED' ? { confidenceLevel: level } : {});
