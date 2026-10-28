// src/features/paper-sets/scan/scanModel.js
//
// The answer-sheet scanner's rules, as pure functions (the screens are beside
// this file, the reading itself is features/omr):
//   - pages read one at a time, merged into one sheet per taker;
//   - which rows a person should look at, and how to say why;
//   - the answers string, with the person's corrections over the reading;
//   - when the live viewfinder has held the sheet still long enough to take it;
//   - the self-check's history entry (an OutsideScore, display only).
import { formatPrintId, normalizeOutsideSubject, OUTSIDE_SCORE_LIMITS } from '@ree/shared';

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Live frames go to the quick check at this size (px, long side); pictures are read at up to CAPTURE_SIDE. */
export const LIVE_SIDE = 640;
export const CAPTURE_SIDE = 2400;

/** The viewfinder's status line. */
export const VIEW_TEXT = {
  fit: 'Fit the four black squares inside the frame',
  hold: 'Hold still',
  reading: 'Reading the sheet',
  starting: 'Starting the camera',
  paused: 'The camera is off. It starts again when you come back to this screen.',
};
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

/** "A", "A and C", "A, B and C". */
export function listLetters(letters) {
  const l = letters || [];
  if (l.length <= 1) return l.join('');
  return `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`;
}

/** One answer character as people read it. */
export function answerLabel(ch) {
  if (ch === '-' || !ch) return 'Blank';
  if (ch === '*') return 'Two marks';
  return ch;
}

/** The answer a row was read as: its letter, '-' blank, '*' two or more marks (an unsure row reads as its top letter). */
export function rowAnswer(row) {
  if (!row || row.status === 'blank') return '-';
  if (row.status === 'multiple') return '*';
  return row.choice || '-';
}

/**
 * The pages of one sheet, merged: every row in item order, each with the page
 * it came from. `missing` lists items no page covered (a page not read yet).
 * @param {object[]} pages  successful reads (`{ page: { index, from, to }, rows }`), any order
 * @param {number} itemCount
 * @returns {{ rows: object[], missing: number[] }}
 */
export function mergePages(pages, itemCount) {
  const byN = new Map();
  [...(pages || [])].sort((a, b) => a.page.index - b.page.index).forEach((p) => {
    (p.rows || []).forEach((row) => {
      if (row.n >= 1 && row.n <= itemCount && !byN.has(row.n)) byN.set(row.n, { ...row, page: p.page.index });
    });
  });
  const rows = [];
  const missing = [];
  for (let n = 1; n <= itemCount; n += 1) {
    if (byN.has(n)) rows.push(byN.get(n));
    else missing.push(n);
  }
  return { rows, missing };
}

/**
 * The answers string: each row's reading, or the person's correction where
 * there is one. An item no page covered is blank.
 * @param {object[]} rows  mergePages(...).rows
 * @param {Record<number, string>} corrections  n -> 'A'..'F' | '-' | '*'
 * @param {number} itemCount
 */
export function answersOf(rows, corrections, itemCount) {
  const out = Array.from({ length: itemCount }, () => '-');
  (rows || []).forEach((row) => {
    if (row.n >= 1 && row.n <= itemCount) out[row.n - 1] = rowAnswer(row);
  });
  Object.entries(corrections || {}).forEach(([n, ch]) => {
    const i = Number(n) - 1;
    if (i >= 0 && i < itemCount && /^[A-F*-]$/.test(ch)) out[i] = ch;
  });
  return out.join('');
}

/**
 * Why a row needs a person's eye, or null when it read cleanly:
 *   multiple  two or more marks ("two marks, A and C")
 *   faint     a light mark only ("faint mark, read as B")
 *   erasure   a mark and a lighter second one ("a second, lighter mark, read as B")
 */
export function flagOf(row) {
  if (!row) return null;
  if (row.status === 'multiple') {
    const marked = [...(row.marked || [])].sort();
    const count = marked.length || 2;
    return { kind: 'multiple', text: `${NUMBER_WORDS[count] || count} marks, ${listLetters(marked)}` };
  }
  if (row.status === 'unsure') {
    if (!row.marked?.length) return { kind: 'faint', text: `faint mark, read as ${row.choice}` };
    return { kind: 'erasure', text: `a second, lighter mark, read as ${row.choice}` };
  }
  return null;
}

/** The rows to check, in item order, each with its flag. */
export const flaggedRows = (rows) => (rows || []).map((row) => ({ row, flag: flagOf(row) })).filter((r) => r.flag);

/** "Item 12: two marks, A and C". */
export const flagSentence = (row, flag = flagOf(row)) => `Item ${row.n}: ${flag ? flag.text : answerLabel(rowAnswer(row))}`;

/** The correction dialog's choices for an item with `optionCount` options. */
export function correctionChoices(optionCount) {
  return [
    ...LETTERS.slice(0, Math.max(0, Math.min(6, optionCount))).map((l) => ({ value: l, label: l })),
    { value: '-', label: 'Blank' },
    { value: '*', label: 'Two marks (invalid)' },
  ];
}

/** The first page of the sheet not read yet (0-based), or null when all are. */
export function nextPage(readIndexes, count) {
  for (let i = 0; i < count; i += 1) if (!readIndexes.has(i)) return i;
  return null;
}

/**
 * The refusal to show for a failed read: a page already read is
 * 'duplicate-page' (the engine reports any page but the expected one as
 * 'wrong-page').
 */
export function refusalReason(result, readIndexes) {
  if (result?.reason === 'wrong-page' && result.page && readIndexes.has(result.page.index)) return 'duplicate-page';
  return result?.reason || 'no-sheet';
}

/** "Page 1 of 2 read. Now scan page 2." */
export const progressLine = (readIndex, count, next) => `Page ${readIndex + 1} of ${count} read. Now scan page ${next + 1}.`;

/**
 * Has the live viewfinder held the sheet still long enough to take it? The
 * last `need` results all found the sheet (the engine's own coverage, skew,
 * blur and ID strip checks passed) and no corner moved more than `drift` of
 * the frame's diagonal across them.
 */
export function steadyLock(history, { need = 6, drift = 0.008, diag }) {
  if (!history || history.length < need || !(diag > 0)) return false;
  const last = history.slice(-need);
  if (!last.every((r) => r && r.found && Array.isArray(r.quad) && r.quad.length === 4)) return false;
  const ref = last[0].quad;
  const limit = drift * diag;
  return last.every((r) => r.quad.every((p, i) => Math.hypot(p.x - ref[i].x, p.y - ref[i].y) <= limit));
}

/**
 * Which of the guide's four corners have a corner square near them (for the
 * brackets that lock): any of `points` within `radius` px.
 */
export function cornerLocks(guideCorners, points, radius) {
  return guideCorners.map((c) => (points || []).some((p) => Math.hypot(p.x - c.x, p.y - c.y) <= radius));
}

/** The guide rectangle in a w x h frame: a sheet's shape (A4), centred, 86% of the room. */
export function guideRect(w, h, aspect = 297 / 210) {
  let gh = h * 0.86;
  let gw = gh / aspect;
  if (gw > w * 0.86) {
    gw = w * 0.86;
    gh = gw * aspect;
  }
  return { x: (w - gw) / 2, y: (h - gh) / 2, w: gw, h: gh };
}

/** The item whose bubbles are nearest (page mm) on that page, or null past `within` mm. */
export function nearestRow(rows, pageIndex, x, y, within = 8) {
  let best = null;
  let bestD = within;
  (rows || []).forEach((row) => {
    if (row.page !== pageIndex) return;
    (row.bubbles || []).forEach((b) => {
      const d = Math.hypot(b.cx - x, b.cy - y);
      if (d <= bestD) {
        bestD = d;
        best = row.n;
      }
    });
  });
  return best;
}

// --- The self-check's history entry ----------------------------------------------

const SHORT_SUBJECT = { Mathematics: 'Math', ESAS: 'ESAS', EE: 'EE' };
const oneDecimal = (n) => String(Math.round(n * 10) / 10);

/** The history subject: the paper's one subject, or ALL for a mixed paper. */
export function selfCheckSubject(sections) {
  const subjects = [...new Set((sections || []).map((s) => normalizeOutsideSubject(s.subject)).filter(Boolean))];
  return subjects.length === 1 ? subjects[0] : 'ALL';
}

/**
 * The self-check's OutsideScore body, for useOutsideScores().add: a display-
 * only history entry (it never reaches theta, readiness or the rankings).
 * @param {{ set: object, draw: object, score: object, takenOn: string, id: string, retestOfId?: string|null }} args
 *   score: scorePaperSheet's result; id: made before the sheet is saved, so the
 *   sheet can name it (`outsideScoreId`)
 */
export function selfCheckEntry({ set, draw, score, takenOn, id, retestOfId = null }) {
  const L = OUTSIDE_SCORE_LIMITS;
  const paperTitle = draw?.plan?.title || set?.title || 'Paper set';
  const label = draw?.setLabel || set?.label || '';
  const title = (label ? `${paperTitle}, ${label}` : paperTitle).slice(0, L.title);
  const parts = (score.sections || []).filter((s) => s.total > 0)
    .map((s) => `${SHORT_SUBJECT[s.subject] || s.subject} ${s.correct}/${s.total}`);
  const result = score.verdict
    ? `${oneDecimal(score.generalAverage ?? 0)}% weighted, ${score.verdict}.`
    : `${oneDecimal(score.percent ?? 0)}%.`;
  const note = [`Printed set ${formatPrintId(set.id)}.`, parts.length ? `${parts.join(', ')}.` : '', result]
    .filter(Boolean).join(' ').slice(0, L.note);
  const subject = selfCheckSubject(draw?.sections || set?.sections);
  const entry = {
    id,
    title,
    source: 'REE.ai paper set',
    subject,
    score: score.correct,
    total: score.scored,
    takenOn,
    note,
    retestOfId,
    // Items left blank: the assessment log's skipped count.
    skipped: (score.perItem || []).filter((state) => state === 'blank').length,
  };
  // A mixed paper keeps each subject's score (sections of one subject added
  // up), so its history entry gets the board rating when all three are in it.
  if (subject === 'ALL') {
    const bySubject = new Map();
    for (const s of score.sections || []) {
      const key = normalizeOutsideSubject(s.subject);
      if (!key || key === 'ALL' || !(s.total > 0)) continue;
      const part = bySubject.get(key) || { subject: key, score: 0, total: 0 };
      part.score += s.correct;
      part.total += s.total;
      bySubject.set(key, part);
    }
    const order = ['Mathematics', 'ESAS', 'EE'];
    const parts = [...bySubject.values()].sort((a, b) => order.indexOf(a.subject) - order.indexOf(b.subject));
    if (parts.length > 0) entry.parts = parts;
  }
  return entry;
}

/**
 * The history entry a second self-check of the same set is a retest of: the
 * first self-check's entry, if it is still in the history and in the same
 * subject (the server refuses any other link), else null.
 * @param {object[]} sheets  the set's sheets
 * @param {object[]} entries  the outside scores (useOutsideScores().items)
 */
export function firstSelfCheckId(sheets, entries, subject) {
  const known = new Map((entries || []).map((e) => [e.id, e]));
  const first = (sheets || [])
    .filter((s) => s.isSelf && s.outsideScoreId && known.has(s.outsideScoreId))
    .sort((a, b) => String(a.scannedAt || '').localeCompare(String(b.scannedAt || '')))[0];
  if (!first) return null;
  const entry = known.get(first.outsideScoreId);
  const root = entry.retestOfId && known.has(entry.retestOfId) ? known.get(entry.retestOfId) : entry;
  return root.subject === subject ? root.id : null;
}
