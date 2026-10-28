// The learner's own rating of a syllabus topic — the CELE tracker's "Meta
// topics" sheet, which asked how confident you were (0-99%) and how
// intimidating the topic felt, with emoji. Here in plain words, and set
// against what the learner's answers say (the topic's decayed mastery).

export const CONFIDENCE_OPTIONS = [
  { value: '', label: 'Not rated' },
  { value: '0', label: '0% sure' },
  { value: '25', label: '25% sure' },
  { value: '50', label: '50% sure' },
  { value: '75', label: '75% sure' },
  { value: '100', label: '100% sure' },
];

export const DREAD_OPTIONS = [
  { value: '', label: 'Not rated' },
  { value: '0', label: 'Bring it on' },
  { value: '1', label: 'Slightly' },
  { value: '2', label: 'Somewhat' },
  { value: '3', label: 'Very' },
  { value: '4', label: 'I’d skip it' },
];

export const dreadLabel = (n) => DREAD_OPTIONS.find((o) => o.value === String(n))?.label || null;

/** Enough answers for the mastery to mean something. */
export const MIN_ANSWERS = 10;
/** Points between the rating and the answers before it's called out. */
export const GAP = 25;
/** Proficient and above (MASTERY_BANDS in @ree/shared). */
const STRONG = 65;
const DREADED = 3;

/**
 * Each topic's own rating against its answers.
 *
 * @param {Array<{topicId, name, subject, attempts, masteryEffective, confidence, dread}>} rows  syllabus rows
 * @returns {{ above, below, dreadedWeak, dreadedStrong, rated, tooFew }}
 *   above: rated surer than the answers by GAP or more (biggest gap first);
 *   below: the answers ahead of the rating by GAP or more;
 *   dreadedWeak / dreadedStrong: dreaded ("Very" or more), below / at Proficient;
 *   rated: how many topics carry a rating; tooFew: rated, but under MIN_ANSWERS answers.
 */
export function compareSelfRating(rows) {
  const rated = (rows || []).filter((r) => r.confidence != null || r.dread != null);
  const known = rated
    .filter((r) => (r.attempts || 0) >= MIN_ANSWERS && Number.isFinite(r.masteryEffective))
    .map((r) => ({ ...r, mastery: Math.round(r.masteryEffective * 100) }));
  const gap = (r) => r.confidence - r.mastery;
  const withConfidence = known.filter((r) => r.confidence != null);
  const dreaded = known.filter((r) => r.dread != null && r.dread >= DREADED);
  return {
    above: withConfidence.filter((r) => gap(r) >= GAP).sort((a, b) => gap(b) - gap(a)),
    below: withConfidence.filter((r) => -gap(r) >= GAP).sort((a, b) => gap(a) - gap(b)),
    dreadedWeak: dreaded.filter((r) => r.mastery < STRONG).sort((a, b) => a.mastery - b.mastery),
    dreadedStrong: dreaded.filter((r) => r.mastery >= STRONG).sort((a, b) => b.mastery - a.mastery),
    rated: rated.length,
    tooFew: rated.length - known.length,
  };
}
