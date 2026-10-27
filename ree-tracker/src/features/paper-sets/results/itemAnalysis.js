// src/features/paper-sets/results/itemAnalysis.js
//
// A printed set's results, from its scanned sheets: the takers' scores, and
// how each item did (classical item analysis). Pure. Every sheet is scored
// here against the set's current key with the same function the server uses
// (scorePaperSheet), so a sheet still waiting in the offline queue counts too.
//
//   p              share of takers who chose the key (0..1)
//   counts         how many chose each option, left it blank, or marked two
//   topWrong       the wrong option chosen most (ties: the earlier letter)
//   discrimination upper 27% minus lower 27% by total score, from 10 takers up
import { effectiveItems, isPassingVerdict, scorePaperSheet } from '@ree/shared';

export const DISCRIMINATION_MIN_TAKERS = 10;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

/** The set as scorePaperSheet takes it: its items with the edits applied. */
export function scoringSet(set) {
  return {
    items: effectiveItems(set?.items || [], set?.edits || {}),
    sections: set?.sections || [],
    profile: set?.profile,
  };
}

/** One sheet's score against the set's current key. */
export const scoreSheet = (keyed, sheet) => scorePaperSheet(keyed, String(sheet?.answers || ''));

/** The sheets that count: takers only, unless self-checks are included. */
export const countedSheets = (sheets, includeSelf = false) => (sheets || [])
  .filter((s) => s && typeof s.answers === 'string' && (includeSelf || !s.isSelf));

/**
 * @param {object} set  the full set (items, edits, sections, profile)
 * @param {object[]} sheets  scanned sheets ({ answers, isSelf, ... })
 * @param {{ includeSelf?: boolean }} [opts]
 * @returns {{
 *   takers: number, mean: number|null, sd: number|null, highest: number|null, lowest: number|null,
 *   passRate: number|null,   // PRC papers only: % passed or conditional
 *   items: { n, subject, key, p, counts, topWrong, discrimination, text }[],
 *   mostMissed: object[],    // up to 10 items, lowest p first (items someone missed)
 * }}  mean, sd, highest and lowest are percentages correct
 */
export function itemAnalysis(set, sheets, { includeSelf = false } = {}) {
  const keyed = scoringSet(set);
  const scored = countedSheets(sheets, includeSelf).map((sheet) => ({ sheet, score: scoreSheet(keyed, sheet) }));
  const n = scored.length;
  const pct = scored.map((x) => x.score.percent);
  const mean = n ? pct.reduce((a, b) => a + b, 0) / n : null;
  const sd = n ? Math.sqrt(pct.reduce((a, p) => a + (p - mean) ** 2, 0) / n) : null;
  const prc = String(set?.profile || '').startsWith('prc');

  let upper = null;
  let lower = null;
  if (n >= DISCRIMINATION_MIN_TAKERS) {
    // Stable: ties keep the sheets' order.
    const ranked = scored.slice().sort((a, b) => b.score.correct - a.score.correct);
    const g = Math.max(1, Math.round(n * 0.27));
    upper = ranked.slice(0, g);
    lower = ranked.slice(n - g);
  }
  const shareRight = (group, i, key) => group.filter((x) => (x.sheet.answers[i] || '-') === key).length / group.length;

  const items = keyed.items.map((it, i) => {
    const letters = LETTERS.slice(0, Math.min(6, (it.options || []).length));
    const counts = Object.fromEntries([...letters.map((l) => [l, 0]), ['blank', 0], ['multiple', 0]]);
    scored.forEach(({ sheet }) => {
      const ch = sheet.answers[i] || '-';
      if (ch === '-') counts.blank += 1;
      else if (ch === '*') counts.multiple += 1;
      else counts[ch] = (counts[ch] || 0) + 1;
    });
    const key = it.answerLetter && it.answerLetter !== '-' ? it.answerLetter : null;
    const p = key && n ? counts[key] / n : null;
    const wrong = letters.filter((l) => l !== key && counts[l] > 0)
      .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
    return {
      n: it.n,
      subject: it.subject,
      key,
      p,
      counts,
      topWrong: wrong[0] || null,
      discrimination: key && upper ? round2(shareRight(upper, i, key) - shareRight(lower, i, key)) : null,
      text: it.text,
    };
  });

  const mostMissed = items.filter((x) => x.p != null && x.p < 1)
    .sort((a, b) => a.p - b.p || a.n - b.n)
    .slice(0, 10);

  return {
    takers: n,
    mean: mean == null ? null : round1(mean),
    sd: sd == null ? null : round1(sd),
    highest: n ? Math.max(...pct) : null,
    lowest: n ? Math.min(...pct) : null,
    passRate: prc && n ? round1((100 * scored.filter((x) => isPassingVerdict(x.score.verdict)).length) / n) : null,
    items,
    mostMissed,
  };
}
