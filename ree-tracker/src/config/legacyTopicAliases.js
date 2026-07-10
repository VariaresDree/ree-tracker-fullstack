// src/config/legacyTopicAliases.js
// Legacy curriculum-course labels → canonical PRC TOS topic names.
// Client-side mirror of the alias map in the backend taxonomy seed
// (ree-tracker-backend/src/config/prcTaxonomy.js) — keep the two in sync.
// Used to normalize formula subtopic tags (bundled seed + admin DB rows) so
// the Reference Hub's topic filter, which now lists PRC names, still matches
// content tagged before the Phase 3.3 taxonomy migration.

const LEGACY_TOPIC_ALIASES = {
  // Mathematics
  'algebra & complex numbers': 'Algebra',
  'calculus 1': 'Differential Calculus',
  'calculus 2': 'Integral Calculus',
  'probability & statistics': 'Probability and Statistics',
  'engineering data analytics': 'Probability and Statistics',
  'differential equations': 'Other Engineering Mathematics',
  'numerical methods & analysis': 'Other Engineering Mathematics',
  // ESAS
  'chemistry for engineers': 'General Chemistry',
  'physics for engineers': 'College Physics',
  'material science': 'Engineering Materials',
  'fundamentals of deformable bodies': 'Engineering Mechanics',
  'basic thermodynamics': 'Thermodynamics',
  'engineering economics': 'Engineering Economics and Management',
  'technopreneurship & project management': 'Engineering Economics and Management',
  'ee laws, codes, & professional ethics': 'Electrical Engineering Law and Code of Ethics',
  'computer programming': 'Computer Fundamentals and Programming',
  'microprocessor systems and logic circuits': 'Computer Fundamentals and Programming',
  // EE
  'electromagnetism': 'Magnetic Circuits',
  'electric circuits 1': 'DC Electric Circuits',
  'electric circuits 2': 'AC Electric Circuits',
  'fundamentals of electronic communications': 'Telecommunications',
  'electronics 1 and 2': 'Active Circuit Elements',
  'electrical apparatus & devices': 'Power System Components',
  'electrical machinery 1': 'DC Generators',
  'electrical machinery 2': 'AC Generators',
  'instrumentation & control': 'Instruments and Measurements',
  'electrical system & illumination design': 'Wiring Design for Buildings',
  'power plant engineering': 'Prime Movers',
  'distribution systems & substation design': 'Power Distribution',
  'power system analysis': 'Power System Interconnection',
};

// Canonical name for a possibly-legacy topic label; unknown labels (including
// 'General' and already-canonical names) pass through unchanged.
export function canonicalizeTopicLabel(label) {
  const key = String(label || '').trim().toLowerCase();
  return LEGACY_TOPIC_ALIASES[key] || label;
}

// Normalize + dedupe a formula's subtopic tag list (two legacy tags can map
// to the same canonical topic).
export function canonicalizeTopicLabels(labels) {
  return [...new Set((labels || []).map(canonicalizeTopicLabel))];
}

export default LEGACY_TOPIC_ALIASES;
