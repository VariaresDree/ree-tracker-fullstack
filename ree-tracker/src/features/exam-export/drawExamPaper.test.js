// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { optionKey, orderOptions } from '@ree/shared';
import {
  AI_SOURCE_MESSAGE, ExportError, answerIndexFor, drawExamPaper, drawWarningLines, examTimeAllotmentMins,
  planSummary, resolveExportPlan,
} from './drawExamPaper';

const q = (id, subject, extra = {}) => ({
  id, subject, subtopic: 'General', text: `Question ${id}`, options: [`a-${id}`, `b-${id}`, `c-${id}`, `d-${id}`], answer: `a-${id}`, ...extra,
});
const bank = (bySubject) => vi.fn(async (subject, subtopic, limit) => (bySubject[subject] || []).slice(0, limit));
const many = (subject, n, prefix = subject) => Array.from({ length: n }, (_, i) => q(`${prefix}-${i + 1}`, subject));

const PRC_BLENDED = { mode: 'blended', subject: 'blended', isPrcStandard: true, count: 100, source: 'library', cognitiveFocus: 'mixed' };
const PRC_EE = { mode: 'subject', subject: 'EE', isPrcStandard: true, count: 100, source: 'library', cognitiveFocus: 'mixed' };
const custom = (over) => ({ mode: 'subject', subject: 'EE', isPrcStandard: false, count: 50, source: 'library', cognitiveFocus: 'mixed', ...over });

describe('resolveExportPlan', () => {
  it('a PRC mixed paper is Math 25, ESAS 30, EE 45 in board order, in 5 hours', () => {
    const plan = resolveExportPlan(PRC_BLENDED);
    expect(plan.kind).toBe('blended');
    expect(plan.code).toBe('BLENDED');
    expect(plan.sections.map((s) => [s.subject, s.count])).toEqual([['Mathematics', 25], ['ESAS', 30], ['EE', 45]]);
    expect(plan.timeAllotmentMins).toBe(300);
    expect(planSummary(plan)).toBe('100 items \u00B7 Math 25 \u00B7 ESAS 30 \u00B7 EE 45 \u00B7 5 hours');
  });

  it('follows the server weights for the mixed paper', () => {
    const plan = resolveExportPlan(PRC_BLENDED, { Mathematics: 0.2, ESAS: 0.3, EE: 0.5 });
    expect(plan.sections.map((s) => s.count)).toEqual([20, 30, 50]);
  });

  it('a PRC subject paper takes the board\'s time: EE 100 items in 6 hours, Math 5, ESAS 4', () => {
    expect(resolveExportPlan(PRC_EE)).toMatchObject({ code: 'EE', totalCount: 100, timeAllotmentMins: 360 });
    expect(resolveExportPlan({ ...PRC_EE, subject: 'Mathematics' })).toMatchObject({ code: 'MATH', timeAllotmentMins: 300 });
    expect(resolveExportPlan({ ...PRC_EE, subject: 'ESAS' })).toMatchObject({ code: 'ESAS', timeAllotmentMins: 240 });
  });

  it('a PRC profile ignores the topic, as setup does', () => {
    expect(resolveExportPlan({ ...PRC_EE, subtopic: 'Machines' }).sections[0].subtopic).toBe('All');
  });

  it('a custom paper is timed at the board\'s pace, to 5 minutes: EE 50 is 3 hours', () => {
    expect(resolveExportPlan(custom()).timeAllotmentMins).toBe(180);
    expect(resolveExportPlan(custom({ subject: 'ESAS', count: 10 })).timeAllotmentMins).toBe(25);
    expect(examTimeAllotmentMins({ profile: 'custom', sections: [{ subject: 'Mathematics', count: 20 }] })).toBe(60);
  });

  it('a custom paper keeps its topic', () => {
    const plan = resolveExportPlan(custom({ subtopic: 'Transformers' }));
    expect(plan.sections[0]).toMatchObject({ subject: 'EE', subtopic: 'Transformers', count: 50 });
    expect(plan.topic).toBe('Transformers');
  });

  it('an AI-written mock can\'t be printed, and says why', () => {
    expect(() => resolveExportPlan(custom({ source: 'ai' }))).toThrow(ExportError);
    expect(() => resolveExportPlan(custom({ source: 'ai' }))).toThrow(AI_SOURCE_MESSAGE);
  });
});

describe('drawExamPaper', () => {
  it('fetches once per section and numbers the items straight through', async () => {
    const fetchQuestions = bank({ Mathematics: many('Mathematics', 25), ESAS: many('ESAS', 30), EE: many('EE', 45) });
    const draw = await drawExamPaper(PRC_BLENDED, { fetchQuestions, fetchWeights: async () => null, sittingKey: 'k', now: new Date('2026-10-20T00:00:00Z') });
    expect(fetchQuestions).toHaveBeenCalledTimes(3);
    // Each section asks for four times its count, to choose from.
    expect(fetchQuestions.mock.calls.map((c) => [c[0], c[1], c[2]])).toEqual([['Mathematics', 'All', 100], ['ESAS', 'All', 120], ['EE', 'All', 180]]);
    expect(draw.sections.map((s) => [s.subject, s.from, s.to])).toEqual([['Mathematics', 1, 25], ['ESAS', 26, 55], ['EE', 56, 100]]);
    expect(draw.items.map((it) => it.n)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(draw.items[30].subject).toBe('ESAS');
    expect(draw.qrPayload).toBe(`REE|${draw.setId}|v${draw.keyVersion}`);
    expect(draw.setLabel).toMatch(/^SET [A-D]$/);
    expect(draw.generatedAt).toBe('2026-10-20T00:00:00.000Z');
  });

  it('asks for a custom topic, and for room to filter by focus', async () => {
    const fetchQuestions = bank({ EE: many('EE', 80).map((x, i) => ({ ...x, type: i % 2 ? 'calculation' : 'theory' })) });
    const draw = await drawExamPaper(custom({ count: 20, subtopic: 'Machines', cognitiveFocus: 'calculation' }), { fetchQuestions });
    expect(fetchQuestions).toHaveBeenCalledWith('EE', 'Machines', 80);
    expect(draw.items).toHaveLength(20);
    expect(draw.items.every((it) => it.type === 'calculation')).toBe(true);
  });

  it('falls back to the mixed set when the focus matches nothing', async () => {
    const draw = await drawExamPaper(custom({ count: 3, cognitiveFocus: 'calculation' }), { fetchQuestions: bank({ EE: many('EE', 5) }) });
    expect(draw.items).toHaveLength(3);
    expect(draw.warnings.focusFallback).toBe(true);
    expect(drawWarningLines(draw)).toContain('No questions matched that focus, so this paper uses the mixed set.');
  });

  it('records a shortfall and removes duplicates across sections', async () => {
    const shared = q('dup', 'Mathematics');
    const fetchQuestions = bank({ Mathematics: [shared, ...many('Mathematics', 24)], ESAS: [shared, shared, ...many('ESAS', 10)], EE: many('EE', 45) });
    const draw = await drawExamPaper(PRC_BLENDED, { fetchQuestions, fetchWeights: async () => null });
    expect(draw.items.filter((it) => it.id === 'dup')).toHaveLength(1);
    expect(draw.warnings.shortfall).toEqual([{ subject: 'ESAS', requested: 30, drawn: 10 }]);
    expect(draw.sections[1]).toMatchObject({ subject: 'ESAS', from: 26, to: 35, requested: 30, drawn: 10 });
    expect(draw.sections[2]).toMatchObject({ from: 36, to: 80 });
  });

  it('flags an answer that matches no option, and keeps going', async () => {
    const fetchQuestions = bank({ EE: [q('x', 'EE', { answer: 'nothing like it' }), q('y', 'EE')] });
    const draw = await drawExamPaper(custom({ count: 2 }), { fetchQuestions });
    const bad = draw.items.find((it) => it.id === 'x');
    expect(bad).toMatchObject({ answerIndex: -1, answerLetter: '-' });
    expect(draw.warnings.unmatched).toEqual([bad.n]);
    expect(drawWarningLines(draw)[0]).toContain(`item ${bad.n} matches none of the options`);
  });

  it('throws when nothing can be drawn', async () => {
    await expect(drawExamPaper(custom(), { fetchQuestions: bank({}) })).rejects.toThrow('No questions match these settings yet.');
  });

  it('marks a stem that mentions a figure, unless it carries an image', async () => {
    const fetchQuestions = bank({ EE: [q('f', 'EE', { text: 'In the circuit shown below, find I.' }), q('g', 'EE', { text: 'See ![x](y.png) as shown' })] });
    const draw = await drawExamPaper(custom({ count: 2 }), { fetchQuestions });
    expect(draw.items.map((it) => [it.id, it.figure]).sort()).toEqual([['f', true], ['g', false]]);
  });

  // Moved from useSimulatorEngine.retake.test.js with the export itself.
  it('a printed paper draws its own choice order, a new one each print', async () => {
    const four = [
      { id: 'q1', subject: 'EE', text: 'Q1', options: ['a1', 'b1', 'c1', 'd1'], answer: 'a1' },
      { id: 'q2', subject: 'EE', text: 'Q2', options: ['a2', 'b2', 'c2', 'd2'], answer: 'a2' },
      { id: 'q3', subject: 'EE', text: 'Q3', options: ['a3', 'b3', 'c3', 'd3'], answer: 'a3' },
    ];
    const fetchQuestions = vi.fn(async () => four);
    const printed = [];
    for (let i = 0; i < 6; i += 1) {
      printed.push((await drawExamPaper(custom({ count: 3 }), { fetchQuestions })).items);
    }
    for (const items of printed) {
      expect(items.map((it) => it.id).sort()).toEqual(['q1', 'q2', 'q3']);
      items.forEach((it) => expect([...it.options].sort()).toEqual(four.find((f) => f.id === it.id).options));
      // The key's letter follows the printed order.
      items.forEach((it) => expect(it.options[it.answerIndex]).toBe(it.answer));
    }
    // Six prints of three questions: not all with the key at A, nor all alike.
    expect(printed.flat().some((it) => it.options[0] !== it.answer)).toBe(true);
    expect(new Set(printed.map((items) => JSON.stringify(items.map((it) => it.options)))).size).toBeGreaterThan(1);
    // The stored rows are untouched.
    expect(four[0].options).toEqual(['a1', 'b1', 'c1', 'd1']);
  });

  it('a given sitting key always gives the same order', async () => {
    const fetchQuestions = bank({ EE: many('EE', 5) });
    const a = await drawExamPaper(custom({ count: 5 }), { fetchQuestions, sittingKey: 'same' });
    const b = await drawExamPaper(custom({ count: 5 }), { fetchQuestions, sittingKey: 'same' });
    expect(a.items.map((it) => it.options)).toEqual(b.items.map((it) => it.options));
    expect(a.items.map((it) => it.id)).toEqual(b.items.map((it) => it.id));
    const first = a.items.find((it) => it.id === 'EE-1');
    expect(first.options).toEqual(orderOptions(many('EE', 1)[0].options, optionKey('same', 'EE-1')));
    expect([a.setId, a.keyVersion]).toEqual([b.setId, b.keyVersion]);
  });

  // Offline the pack hands back its first rows every time, so a set that
  // took exactly what it asked for reprinted the same questions on every
  // "Draw a new set".
  it('a new set draws new questions from the same pool, and the same key the same ones', async () => {
    const pool = many('EE', 40);
    const fetchQuestions = vi.fn(async (_s, _t, limit) => pool.slice(0, limit));
    const ids = async (key) => (await drawExamPaper(custom({ count: 10 }), { fetchQuestions, sittingKey: key })).items.map((it) => it.id).sort();
    expect(fetchQuestions).not.toHaveBeenCalled();
    const first = await ids('set-1');
    expect(await ids('set-1')).toEqual(first);
    const others = await Promise.all(['set-2', 'set-3', 'set-4'].map(ids));
    expect(others.some((o) => JSON.stringify(o) !== JSON.stringify(first))).toBe(true);
    expect(fetchQuestions.mock.calls[0][2]).toBe(40);
  });

  it('a skipped duplicate is replaced from the headroom, so the paper is full', async () => {
    const dup = many('EE', 1)[0];
    const fetchQuestions = vi.fn(async () => [dup, dup, ...many('EE', 30).slice(1)]);
    const draw = await drawExamPaper(custom({ count: 10 }), { fetchQuestions });
    expect(draw.items).toHaveLength(10);
    expect(draw.warnings.shortfall).toEqual([]);
  });
});

describe('answerIndexFor', () => {
  it('finds the stored answer in the presented order', () => {
    expect(answerIndexFor({ options: ['3 V', '12 V', '6 V'], answer: '12 V' })).toBe(1);
  });

  it('matches up to form: delimiters, spacing, a closing full stop', () => {
    expect(answerIndexFor({ options: ['$1 - k^3$', '$k$'], answer: '1 - k^3' })).toBe(0);
    expect(answerIndexFor({ options: ['Ten volts.', 'Five'], answer: 'Ten volts' })).toBe(0);
  });

  it('falls back to the printed text, then gives up', () => {
    expect(answerIndexFor({ options: ['A. 12 V', 'B. 6 V'], answer: '  6 v ' })).toBe(1);
    expect(answerIndexFor({ options: ['3 V', '12 V'], answer: '99 V' })).toBe(-1);
    expect(answerIndexFor({ options: [], answer: 'x' })).toBe(-1);
  });
});
