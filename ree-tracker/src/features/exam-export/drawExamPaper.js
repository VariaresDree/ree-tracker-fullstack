// src/features/exam-export/drawExamPaper.js
//
// One printed set, drawn once and rendered by both outputs (the print preview
// in paper-sets/print and the LaTeX in buildExamTex.js), so a set's question
// paper, answer sheet and key always agree.
//
// The draw follows the setup screen:
//   - a mixed paper is drawn per section by board weight (Mathematics 25,
//     ESAS 30, EE 45 by default), in board order, one fetch per subject, so it
//     also works offline from the saved question pack;
//   - a custom mock keeps its topic and length; PRC profiles ignore the topic,
//     as the setup screen does;
//   - the cognitive focus is honoured (poolFilters, shared with the sitting);
//   - the time allotment is the board's: PRC_EXAM_FORMAT for a subject paper,
//     5 hours for the mixed paper, the board's pace per item for a custom one.
// Each set shows every question's choices in its own order (presentOptions,
// keyed by a fresh sitting key), and the key's letters follow that order.
import {
  PRC_EXAM_FORMAT, DEFAULT_SYLLABUS_WEIGHTS, apportionItems, boardPaceSeconds, matchOption,
  newSittingKey, normalizeSubject, shuffleWithKey,
} from '@ree/shared';
import { presentOptions } from '../quiz/presentOptions';
import {
  SUBJECT_CODE, answerLetterFor, deriveExamIdentity, formatDuration, partLabel, setLabelFor,
} from './paperFormat';
import { applyFocusFilter } from '../board-simulator/poolFilters';
import { PRC_TIMES } from '../../config/examStandards';
import { mentionsFigure } from './markdownToLatex';

/** A reason the paper can't be printed, shown to the learner as is. */
export class ExportError extends Error {
  constructor(message, code = 'export') {
    super(message);
    this.name = 'ExportError';
    this.code = code;
  }
}

export const AI_SOURCE_MESSAGE = "AI questions are written for each sitting, so they can't be printed. Choose Question bank to print a paper.";
export const EMPTY_MESSAGE = 'No questions match these settings yet.';

/** Board order: Part I, II, III of a mixed paper. */
export const BOARD_ORDER = ['Mathematics', 'ESAS', 'EE'];
export const SECTION_TITLE = {
  Mathematics: 'Mathematics',
  ESAS: 'Engineering Sciences and Allied Subjects',
  EE: 'Electrical Engineering Professional Subjects',
};
export const SHORT_LABEL = { Mathematics: 'Math', ESAS: 'ESAS', EE: 'EE' };
export { partLabel };

const letterOf = (i) => String.fromCharCode(65 + i);
const roundUp5 = (mins) => Math.max(5, Math.ceil(mins / 5) * 5);

/** Minutes the paper allows: the board's schedule, or its pace per item. */
export function examTimeAllotmentMins(plan) {
  if (plan.profile === 'prc_subject') {
    const subject = plan.sections[0]?.subject;
    return PRC_EXAM_FORMAT[subject]?.minutes || PRC_TIMES.BLENDED / 60;
  }
  if (plan.profile === 'prc_blended') return PRC_TIMES.BLENDED / 60;
  const secs = plan.sections.reduce((acc, s) => acc + s.count * (boardPaceSeconds(s.subject) || 180), 0);
  return roundUp5(secs / 60);
}

/**
 * What to print, from the setup screen's config: the sections, their counts
 * and topics, the code and title, and the time allotment. Pure.
 * Throws ExportError when the config can't be printed (an AI-written mock).
 */
export function resolveExportPlan(config = {}, weights = DEFAULT_SYLLABUS_WEIGHTS) {
  const blended = config.mode === 'blended';
  const prc = !!config.isPrcStandard;
  const profile = prc ? (blended ? 'prc_blended' : 'prc_subject') : 'custom';
  // The source choice only shows (and only applies) on a custom mock.
  if (profile === 'custom' && config.source === 'ai') throw new ExportError(AI_SOURCE_MESSAGE, 'ai-source');

  let sections;
  let totalCount;
  if (blended) {
    totalCount = prc ? 100 : Math.max(1, Math.floor(config.count || 100));
    const split = apportionItems(totalCount, weights || DEFAULT_SYLLABUS_WEIGHTS);
    sections = BOARD_ORDER
      .filter((s) => (split[s] || 0) > 0)
      .map((s) => ({ subject: s, title: SECTION_TITLE[s], count: split[s], subtopic: 'All' }));
  } else {
    const subject = normalizeSubject(config.subject);
    if (!BOARD_ORDER.includes(subject)) throw new ExportError('Choose a subject to print a paper.', 'subject');
    totalCount = prc ? (PRC_EXAM_FORMAT[subject]?.items || 100) : Math.max(1, Math.floor(config.count || 20));
    const subtopic = profile === 'custom' && config.subtopic && config.subtopic !== 'All' ? config.subtopic : 'All';
    sections = [{ subject, title: SECTION_TITLE[subject], count: totalCount, subtopic }];
  }

  const single = sections.length === 1 && !blended;
  const plan = {
    kind: blended ? 'blended' : 'subject',
    profile,
    code: blended ? 'BLENDED' : SUBJECT_CODE[sections[0].subject],
    title: single ? sections[0].title : 'Mixed Paper: Mathematics, ESAS and EE',
    topic: single && sections[0].subtopic !== 'All' ? sections[0].subtopic : null,
    sections,
    cognitiveFocus: config.cognitiveFocus || 'mixed',
    totalCount,
  };
  plan.timeAllotmentMins = examTimeAllotmentMins(plan);
  return plan;
}

/** "100 items \u00B7 Math 25 \u00B7 ESAS 30 \u00B7 EE 45 \u00B7 5 hours" */
export function planSummary(plan) {
  const parts = [`${plan.totalCount} items`];
  if (plan.kind === 'blended') plan.sections.forEach((s) => parts.push(`${SHORT_LABEL[s.subject]} ${s.count}`));
  else parts.push(plan.sections[0].subtopic !== 'All' ? `${SHORT_LABEL[plan.sections[0].subject]}, ${plan.sections[0].subtopic}` : SHORT_LABEL[plan.sections[0].subject]);
  parts.push(formatDuration(plan.timeAllotmentMins));
  return parts.join(' \u00B7 ');
}

/**
 * The option index the stored answer names in the PRESENTED order, or -1.
 * matchOption first (exact, then equal up to form), then answerLetterFor's
 * looser comparison of the printed text.
 */
export function answerIndexFor(question) {
  const options = Array.isArray(question?.options) ? question.options : [];
  const hit = matchOption(question?.answer, options);
  if (hit != null) {
    const at = options.indexOf(hit);
    if (at >= 0) return at;
  }
  const { letter, matched } = answerLetterFor({ ...question, options });
  return matched ? letter.charCodeAt(0) - 65 : -1;
}

const keyOf = (q) => (q?.id != null ? `id:${q.id}` : `t:${q?.text ?? q?.question ?? ''}`);
const printable = (q) => q && Array.isArray(q.options) && q.options.length >= 2;
const IMAGE_RE = /!\[[^\]]*\]\([^)]*\)/;

const defaultFetchQuestions = (subject, subtopic, limit) => import('../../services/dbQueries')
  .then((m) => m.fetchVaultQuestions(subject, subtopic, limit));
const defaultFetchWeights = () => import('../../services/dbQueries').then((m) => m.fetchSyllabusWeights());

// A set's questions: spread across subtopics like the sitting's sample, but
// seeded by the set's key, so the same key reprints the same paper and
// "Draw a new set" (a new key) brings new questions, offline too.
function pickForSet(pool, count, key) {
  const shuffled = shuffleWithKey(pool, key);
  if (shuffled.length <= count) return shuffled;
  const buckets = new Map();
  for (const q of shuffled) {
    const k = q?.subtopic || 'General';
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(q);
  }
  const groups = [...buckets.values()];
  const picked = [];
  while (picked.length < count) {
    for (const g of groups) if (g.length && picked.length < count) picked.push(g.shift());
  }
  return picked;
}

/**
 * Draw a printed set.
 * @param {object} config  the setup screen's config
 * @param {{ sittingKey?: string, now?: Date, fetchQuestions?: Function, fetchWeights?: Function }} [deps]
 * @returns {Promise<object>} an ExamDraw
 */
export async function drawExamPaper(config, {
  sittingKey = newSittingKey(),
  now = new Date(),
  fetchQuestions = defaultFetchQuestions,
  fetchWeights = defaultFetchWeights,
} = {}) {
  let weights = DEFAULT_SYLLABUS_WEIGHTS;
  if (config?.mode === 'blended') {
    try { weights = (await fetchWeights()) || DEFAULT_SYLLABUS_WEIGHTS; } catch { weights = DEFAULT_SYLLABUS_WEIGHTS; }
  }
  const plan = resolveExportPlan(config, weights);
  const warnings = { unmatched: [], shortfall: [], focusFallback: false };
  const seen = new Set();
  const items = [];
  const sections = [];

  for (const section of plan.sections) {
    // Fetched with room to choose, and always sampled. Offline the pack hands
    // back its first N every time, so taking exactly N printed the same
    // questions on every "Draw a new set"; and a duplicate or unprintable
    // item skipped below left the paper short with nothing to replace it.
    const limit = Math.min(2000, section.count * 4);
    const raw = (await fetchQuestions(section.subject, section.subtopic, limit)) || [];
    const { pool, fallback } = applyFocusFilter(raw.filter(printable), plan.cognitiveFocus);
    if (fallback) warnings.focusFallback = true;
    const unique = [];
    const local = new Set();
    for (const q of pool) {
      const k = keyOf(q);
      if (seen.has(k) || local.has(k)) continue;
      local.add(k);
      unique.push(q);
    }
    const picked = pickForSet(unique, section.count, `${sittingKey}|${section.subject}`);
    picked.forEach((q) => seen.add(keyOf(q)));
    if (picked.length < section.count) {
      warnings.shortfall.push({ subject: section.subject, requested: section.count, drawn: picked.length });
    }
    if (picked.length === 0) continue;

    const from = items.length + 1;
    for (const q of picked) {
      const shown = presentOptions(q, sittingKey);
      const options = [...shown.options];
      const answerIndex = answerIndexFor({ ...shown, options });
      const n = items.length + 1;
      if (answerIndex < 0) warnings.unmatched.push(n);
      const text = String(q.text ?? q.question ?? '');
      items.push({
        n,
        id: q.id ?? null,
        subject: section.subject,
        subtopic: q.subtopic || null,
        difficulty: q.difficulty ?? null,
        type: q.type || q.questionType || null,
        text,
        options,
        answer: shown.answer ?? '',
        answerIndex,
        answerLetter: answerIndex >= 0 ? letterOf(answerIndex) : '-',
        explanation: q.fixedExplanation || q.explanation || null,
        figure: mentionsFigure(text) && !IMAGE_RE.test(text),
      });
    }
    sections.push({
      subject: section.subject,
      title: section.title,
      from,
      to: items.length,
      requested: section.count,
      drawn: picked.length,
    });
  }

  if (items.length === 0) throw new ExportError(EMPTY_MESSAGE, 'empty');

  const { setId, keyVersion } = deriveExamIdentity(items, items.map((it) => it.answerLetter));
  return {
    plan,
    sittingKey,
    generatedAt: now.toISOString(),
    setId,
    keyVersion,
    setLabel: setLabelFor(setId),
    qrPayload: `REE|${setId}|v${keyVersion}`,
    sections,
    items,
    warnings,
  };
}

/** The draw's warnings as sentences for the dialog. */
export function drawWarningLines(draw) {
  const lines = [];
  const w = draw?.warnings;
  if (!w) return lines;
  if (w.unmatched.length) {
    const list = w.unmatched.slice(0, 8).join(', ') + (w.unmatched.length > 8 ? ', and more' : '');
    lines.push(`The stored answer for item${w.unmatched.length === 1 ? '' : 's'} ${list} matches none of the options, so the key shows "--". Check ${w.unmatched.length === 1 ? 'it' : 'them'} in the question bank.`);
  }
  w.shortfall.forEach((s) => lines.push(`Only ${s.drawn} of ${s.requested} ${SHORT_LABEL[s.subject] || s.subject} questions were available.`));
  if (w.focusFallback) lines.push('No questions matched that focus, so this paper uses the mixed set.');
  return lines;
}
