// src/features/paper-sets/printedSetModel.js
//
// A printed set (Exams > Paper sets) as data, and pure functions over it.
//
// A set is one draw (exam-export/drawExamPaper), saved to the account with an
// id made on this device (shown as K7P2-9QXA-M3TD on every page and in the
// sheet's QR). Its items stay as drawn; edits made for this printing sit
// beside them ({ "<n>": { text?, options?, answerIndex?, explanation? } }) and
// change only this set, never the question bank. `effectiveDraw` lays the
// edits over the items and hands the renderers (the print preview, the .tex)
// the same "draw" shape the draw itself has, so they render the edited set.
//
// No side effects here: the API, the device cache and the hooks are beside
// this file.
import {
  PAPER_PROFILES, PAPER_SET_LIMITS, PRINT_ID_ALPHABET, effectiveItems, keyVersionOf, stripChoicePrefix,
} from '@ree/shared';
import { mentionsFigure } from '../exam-export/markdownToLatex';

export const PAPERS = ['a4', 'letter', 'long'];
export const DOCUMENT_KEYS = ['paper', 'sheet', 'key'];
/** Where the last paper size chosen is remembered, for the next set. */
export const PAPER_STORAGE_KEY = 'ree-print-paper';

// The setup screen's choices a set keeps, for "Draw a new set" (the server
// keeps only these too).
const CONFIG_KEYS = ['mode', 'subject', 'subtopic', 'count', 'isPrcStandard', 'source', 'cognitiveFocus', 'timeLimitMins'];

const randomBytes = (n) => {
  const bytes = new Uint8Array(n);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
};

/**
 * A new set id: 12 Crockford base32 characters. 256 is a multiple of 32, so
 * the low five bits of a random byte pick a character without bias.
 */
export function newPrintId(random = randomBytes) {
  return Array.from(random(12), (b) => PRINT_ID_ALPHABET[b & 31]).join('');
}

/** The last paper size chosen on this device, else A4. */
export function storedPaper() {
  try {
    const value = globalThis.localStorage?.getItem(PAPER_STORAGE_KEY);
    return PAPERS.includes(value) ? value : 'a4';
  } catch {
    return 'a4';
  }
}

export function rememberPaper(paper) {
  try {
    if (PAPERS.includes(paper)) globalThis.localStorage?.setItem(PAPER_STORAGE_KEY, paper);
  } catch { /* private mode: the next set starts on A4 */ }
}

/** A new set's print choices: the remembered paper, every document, worked solutions. */
export function defaultPrefs() {
  return { paper: storedPaper(), docs: { paper: true, sheet: true, key: true }, solutions: true };
}

function profileOf(plan) {
  if (PAPER_PROFILES.includes(plan?.profile)) return plan.profile;
  return 'custom';
}

const pickConfig = (config = {}) => Object.fromEntries(
  CONFIG_KEYS.filter((k) => config[k] !== undefined && config[k] !== null).map((k) => [k, config[k]]),
);

/**
 * The create body for a draw.
 * @param {object} draw  an ExamDraw (drawExamPaper)
 * @param {{ id: string, config?: object, prefs?: object }} opts
 */
export function toPrintedSet(draw, { id, config, prefs = defaultPrefs() }) {
  const plan = draw.plan || {};
  return {
    id,
    contentId: draw.setId,
    label: draw.setLabel,
    title: String(plan.title || '').slice(0, PAPER_SET_LIMITS.title),
    code: plan.code || 'EE',
    profile: profileOf(plan),
    sittingKey: draw.sittingKey,
    generatedAt: draw.generatedAt,
    config: pickConfig(config),
    plan,
    sections: (draw.sections || []).map((s) => ({ subject: s.subject, title: s.title, from: s.from, to: s.to })),
    items: (draw.items || []).map((it) => ({
      n: it.n,
      id: it.id == null ? null : String(it.id),
      subject: it.subject,
      subtopic: it.subtopic ?? null,
      difficulty: it.difficulty ?? null,
      type: it.type ?? null,
      text: String(it.text ?? ''),
      options: (it.options || []).map((o) => String(o ?? '')),
      answer: String(it.answer ?? ''),
      answerIndex: Number.isInteger(it.answerIndex) ? it.answerIndex : -1,
      explanation: it.explanation ?? null,
      figure: !!it.figure,
    })),
    edits: {},
    prefs,
    warnings: draw.warnings || null,
  };
}

/**
 * Why a create body can't be saved (an item past the server's limits, or the
 * whole set too large), or null.
 */
export function setSizeProblem(body) {
  const L = PAPER_SET_LIMITS;
  if (!body.items.length) return 'This paper has no questions.';
  if (body.items.length > L.items) return `A printed set holds up to ${L.items} questions.`;
  const long = body.items.find((it) => it.text.length > L.stem || it.options.length > L.options
    || it.options.some((o) => o.length > L.option) || String(it.explanation || '').length > L.explanation);
  if (long) return `Question ${long.n} is too long to print. Draw a new set.`;
  if (JSON.stringify(body).length > L.bytes) return 'This paper is too large to save. Choose fewer questions.';
  return null;
}

/** Options per item, in item order: what the answer sheet's layout (and its hash) depend on. */
export const optionCountsOf = (items) => (items || []).map((it) => (it.options || []).length);

// As the draw decides it (drawExamPaper): a stem that mentions a figure
// gets the placeholder box, unless it carries its own image.
const IMAGE_RE = /!\[[^\]]*\]\([^)]*\)/;
const needsFigureBox = (text) => mentionsFigure(text) && !IMAGE_RE.test(text);

/**
 * The set as an ExamDraw with its edits applied, plus `printId` and `paper`.
 * The unmatched-key warning follows the edited key: an edit that names the
 * answer clears it.
 */
export function effectiveDraw(set) {
  if (!set) return null;
  // An edited stem decides its figure box again.
  const items = effectiveItems(set.items || [], set.edits || {})
    .map((it) => (it.edited && typeof set.edits?.[String(it.n)]?.text === 'string' ? { ...it, figure: needsFigureBox(it.text) } : it));
  const keyVersion = keyVersionOf(items);
  const w = set.warnings || {};
  return {
    plan: set.plan || {},
    sittingKey: set.sittingKey,
    generatedAt: set.generatedAt,
    setId: set.contentId,
    keyVersion,
    setLabel: set.label,
    qrPayload: `REE|${set.contentId}|v${keyVersion}`,
    sections: set.sections || [],
    items,
    warnings: {
      unmatched: items.filter((it) => !(it.answerIndex >= 0)).map((it) => it.n),
      shortfall: Array.isArray(w.shortfall) ? w.shortfall : [],
      focusFallback: !!w.focusFallback,
    },
    printId: set.id,
    paper: PAPERS.includes(set.prefs?.paper) ? set.prefs.paper : 'a4',
  };
}

/** Two unsent changes as one: later edits per item win, prefs replace, printed sticks. */
export function mergeDelta(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const out = { ...a };
  if (b.edits) out.edits = { ...(a.edits || {}), ...b.edits };
  if (b.prefs) out.prefs = b.prefs;
  if (b.printed) out.printed = true;
  return out;
}

/**
 * A PATCH body applied to a set, as the server applies it: each item's edit
 * replaced (null reverts it), prefs replaced, printedAt set once, and the key
 * version recomputed. A summary without items keeps its key version.
 */
export function applySetPatch(set, delta, at = new Date().toISOString()) {
  if (!set || !delta) return set;
  const next = { ...set };
  if (delta.edits && typeof delta.edits === 'object') {
    const edits = { ...(set.edits || {}) };
    for (const [n, e] of Object.entries(delta.edits)) {
      if (e == null) delete edits[n];
      else edits[n] = e;
    }
    next.edits = edits;
  }
  if (delta.prefs) next.prefs = delta.prefs;
  if (delta.printed && !set.printedAt) next.printedAt = at;
  if (Array.isArray(next.items)) next.keyVersion = keyVersionOf(effectiveItems(next.items, next.edits || {}));
  return next;
}

/** The editor's starting values for an item as it prints now. */
export function formFor(item) {
  return {
    text: String(item?.text ?? ''),
    options: (item?.options || []).map((o) => stripChoicePrefix(String(o ?? ''))),
    answerIndex: Number.isInteger(item?.answerIndex) ? item.answerIndex : -1,
    explanation: String(item?.explanation ?? ''),
  };
}

/**
 * The edit for an item: only what differs from the question bank's wording
 * (`original`, the item as drawn), or null when nothing does. Changed options
 * always carry the answer with them (the shared rules require it).
 */
export function editFor(original, form) {
  const edit = {};
  const text = String(form.text ?? '').trim();
  if (text !== String(original?.text ?? '').trim()) edit.text = text;
  const before = (original?.options || []).map((o) => stripChoicePrefix(String(o ?? '')).trim());
  const options = (form.options || []).map((o) => String(o ?? '').trim());
  const answerIndex = Number.isInteger(form.answerIndex) ? form.answerIndex : -1;
  const originalAnswer = Number.isInteger(original?.answerIndex) ? original.answerIndex : -1;
  if (options.length !== before.length || options.some((o, i) => o !== before[i])) {
    edit.options = options;
    edit.answerIndex = answerIndex;
  } else if (answerIndex !== originalAnswer) {
    edit.answerIndex = answerIndex;
  }
  const explanation = String(form.explanation ?? '').trim() || null;
  if (explanation !== (String(original?.explanation ?? '').trim() || null)) edit.explanation = explanation;
  return Object.keys(edit).length ? edit : null;
}

/** Nothing has happened to it yet: never printed, never edited, no sheets. */
export function isUnusedSet(set, sheetCount = 0) {
  return !!set && !set.printedAt && !Object.keys(set.edits || {}).length && !sheetCount;
}

/** A set as the list shows it (the server's summaries carry no items or edits). */
export function summaryOf(set) {
  // eslint-disable-next-line no-unused-vars
  const { items, edits, plan, config, warnings, ...rest } = set;
  return {
    ...rest,
    itemCount: set.itemCount ?? (items || []).length,
    edited: set.edited ?? Object.keys(edits || {}).length > 0,
  };
}
