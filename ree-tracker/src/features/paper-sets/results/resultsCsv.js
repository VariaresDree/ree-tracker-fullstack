// src/features/paper-sets/results/resultsCsv.js
//
// A printed set's results as CSV, for a spreadsheet: one row per taker, and
// one row per item (the item analysis). RFC 4180: comma-separated, CRLF line
// ends, a field quoted when it holds a comma, a quote or a line break, its
// quotes doubled.
//
// Names and question text are typed by people, and a spreadsheet runs a cell
// that starts with = + - @ (or a tab or carriage return) as a formula
// ("=HYPERLINK(...)"): such a cell gets a leading apostrophe, which shows the
// text as typed. Numbers are written as numbers.
import { formatPrintId } from '@ree/shared';
import { countedSheets, scoreSheet, scoringSet } from './itemAnalysis';

const FORMULA_START = /^[=+\-@\t\r]/;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** One field. */
export function csvCell(value) {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let s = String(value);
  if (FORMULA_START.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Rows of fields as one CSV text, CRLF after every row. */
export const toCsv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

/** "2026-10-27 14:05", Manila time (UTC+8 all year, no daylight saving). */
export function manilaDateTime(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  return new Date(t + 8 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

/** A sheet's name as the results show it. */
export const sheetName = (sheet) => sheet?.takerName || (sheet?.isSelf ? 'Self-check' : 'No name');

/**
 * One row per sheet, in the order given: name, score, items scored, percent,
 * each Part's correct and total, the general average and verdict (PRC
 * papers), when it was scanned, then the answer to each item (blank left
 * empty, * for two marks).
 */
export function toResultsCsv(set, sheets) {
  const keyed = scoringSet(set);
  const sections = keyed.sections;
  const head = [
    'Name', 'Score', 'Scored', 'Percent',
    ...sections.flatMap((s) => [`${s.subject} correct`, `${s.subject} total`]),
    'General average', 'Verdict', 'Scanned at (Manila)',
    ...keyed.items.map((it) => String(it.n)),
  ];
  const rows = (sheets || []).map((sheet) => {
    const r = scoreSheet(keyed, sheet);
    const answers = String(sheet.answers || '');
    return [
      sheetName(sheet), r.correct, r.scored, r.percent,
      ...r.sections.flatMap((s) => [s.correct, s.total]),
      r.generalAverage, r.verdict, manilaDateTime(sheet.scannedAt),
      ...keyed.items.map((_, i) => {
        const ch = answers[i] || '-';
        return ch === '-' ? '' : ch;
      }),
    ];
  });
  return toCsv([head, ...rows]);
}

/**
 * One row per item: its number, subject, key, percent correct, how many
 * chose each option, left it blank or marked two, the wrong option chosen
 * most, the discrimination index (from 10 takers), and the question.
 * @param {object} set
 * @param {object} analysis  itemAnalysis(set, sheets, ...)
 */
export function toItemAnalysisCsv(set, analysis) {
  const widest = Math.max(0, ...analysis.items.map((it) => Object.keys(it.counts).filter((k) => LETTERS.includes(k)).length));
  const letters = LETTERS.slice(0, widest);
  const head = ['Item', 'Subject', 'Key', 'Percent correct', ...letters, 'Blank', 'Two marks', 'Most-chosen wrong', 'Discrimination', 'Question'];
  const rows = analysis.items.map((it) => [
    it.n, it.subject, it.key || '', it.p == null ? null : Math.round(it.p * 1000) / 10,
    ...letters.map((l) => (l in it.counts ? it.counts[l] : null)),
    it.counts.blank, it.counts.multiple, it.topWrong || '', it.discrimination, it.text,
  ]);
  return toCsv([head, ...rows]);
}

/** "SETB-K7P2-9QXA-M3TD-results.csv" */
export function csvFileName(set, kind) {
  const label = String(set?.label || 'SET').replace(/\s+/g, '');
  return `${label}-${formatPrintId(set?.id || '')}-${kind}.csv`;
}

export { countedSheets };
