// The learner's own rating of a syllabus topic — the CELE tracker's "Meta
// topics" sheet, which asked how confident you were (0-99%) and how
// intimidating the topic felt, with emoji. Here two separate scales, because
// they aren't opposites, set against what the learner's answers say (the topic's
// decayed mastery). The values are what's stored; the words are free to change.

// Slate to a confident green.
const sure = (percent) => `color-mix(in srgb, var(--scale-sure) ${percent}%, var(--scale-calm))`;
export const CONFIDENCE_SCALE = {
  label: 'How sure are you?',
  anchors: ['Just guessing', 'Fairly confident', 'Absolute certainty'],
  fillGradient: `linear-gradient(to right, ${sure(0)}, ${sure(100)})`,
  stops: [
    { value: 0, label: 'Just guessing', tone: 'neutral', fill: sure(0) },
    { value: 25, label: 'Unsure', tone: 'neutral', fill: sure(25) },
    { value: 50, label: 'Fairly confident', tone: 'signal', fill: sure(50) },
    { value: 75, label: 'Confident', tone: 'success', fill: sure(75) },
    { value: 100, label: 'Absolute certainty', tone: 'success', fill: sure(100) },
  ],
};

// Pale yellow, through orange, to a muted crimson.
const fillPale = 'var(--scale-pale)';
const fillOrange = 'var(--scale-orange)';
const fillCrimson = 'var(--scale-crimson)';
const between = (percent) => `color-mix(in srgb, ${fillCrimson} ${percent}%, ${fillOrange})`;
export const DREAD_SCALE = {
  // Kept as "dread": candid, and the word the rest of the app uses. The calm words
  // and colours at the low end carry the softening.
  label: 'How much do you dread it?',
  anchors: ['No worries', 'Anxious', 'Pure dread'],
  fillGradient: `linear-gradient(to right, ${fillPale}, ${fillOrange}, ${fillCrimson})`,
  stops: [
    { value: 0, label: 'No worries', tone: 'success', fill: fillPale },
    { value: 1, label: 'A little uneasy', tone: 'signal', fill: `color-mix(in srgb, ${fillOrange} 60%, ${fillPale})` },
    { value: 2, label: 'Anxious', tone: 'amber', fill: fillOrange },
    { value: 3, label: 'Very anxious', tone: 'amber', fill: between(50) },
    { value: 4, label: 'Pure dread', tone: 'danger', fill: fillCrimson },
  ],
};

export const dreadLabel = (n) => DREAD_SCALE.stops.find((s) => s.value === n)?.label || null;

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
