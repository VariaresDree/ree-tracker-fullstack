// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import {
  README, buildAnswerKeyTex, buildAnswerSheetTex, buildExamTex, buildQuestionPaperTex, texFileName, zipFileName, zipTexFiles,
} from './buildExamTex';
import { PRACTICE_LINE, chooseOptionLayout, qrTikz } from './texTemplates';
import { FAKE_QR, twelveItemDraw } from './__fixtures__/fixtureDraws';
import { bracesBalanced, countOf, envsBalanced, isAscii } from './__fixtures__/texAssert';

let draw;
let files;
beforeAll(async () => {
  draw = await twelveItemDraw();
  ({ files } = await buildExamTex(draw, { paper: 'a4', includeSolutions: true, qr: FAKE_QR }));
});
const file = (kind) => files.find((f) => f.kind === kind);

describe('the fixture draw', () => {
  it('covers the hard cases: 4, 5 and 6 options, an unmatched key, a figure, a mixed paper', () => {
    expect(draw.items).toHaveLength(12);
    expect(new Set(draw.items.map((it) => it.options.length))).toEqual(new Set([4, 5, 6]));
    expect(draw.items.filter((it) => it.answerIndex < 0)).toHaveLength(1);
    expect(draw.items.filter((it) => it.figure)).toHaveLength(1);
    expect(draw.sections.map((s) => [s.subject, s.from, s.to])).toEqual([['Mathematics', 1, 3], ['ESAS', 4, 7], ['EE', 8, 12]]);
  });
});

describe('every document', () => {
  it.each(['paper', 'sheet', 'key'])('%s is one well-formed, self-contained, ASCII-only document', (kind) => {
    const { content, name, bytes } = file(kind);
    expect(countOf(content, /\\documentclass(\[[^\]]*\])?\{article\}/g)).toBe(1);
    expect(countOf(content, /\\begin\{document\}/g)).toBe(1);
    expect(countOf(content, /\\end\{document\}/g)).toBe(1);
    expect(content.trimEnd().endsWith('\\end{document}')).toBe(true);
    expect(isAscii(content)).toBe(true);
    expect(bracesBalanced(content)).toBe(true);
    expect(envsBalanced(content)).toBe(true);
    for (const pkg of ['amsmath', 'tabularx', 'multicol', 'enumitem', 'tikz', 'fancyhdr', 'lastpage']) expect(content).toContain(pkg);
    expect(content).toContain(PRACTICE_LINE);
    expect(content).toContain(`\\fancyfoot[L]{\\scriptsize\\color{black!60}REE Pre-board -- BLENDED -- ${draw.setLabel} -- Set ${draw.setId} -- Key v${draw.keyVersion}}`);
    expect(content).toContain('Page \\thepage\\ of \\pageref{LastPage}');
    expect(name).toBe(texFileName(draw, kind));
    expect(bytes).toBe(content.length);
  });

  it('names files by code, set and Manila date', () => {
    expect(file('paper').name).toBe(`REE-BLENDED-${draw.setLabel.replace(' ', '')}-2026-10-20-questions.tex`);
    expect(file('sheet').name).toMatch(/-answer-sheet\.tex$/);
    expect(file('key').name).toMatch(/-key\.tex$/);
    expect(zipFileName(draw)).toMatch(/^REE-BLENDED-SET[A-D]-2026-10-20-latex\.zip$/);
  });

  it.each([
    ['a4', 'a4paper'],
    ['letter', 'letterpaper'],
    ['long', 'paperwidth=8.5in,paperheight=13in'],
  ])('sets the %s page size', (paper, geometry) => {
    const { content } = buildQuestionPaperTex(draw, { paper });
    expect(content).toContain(`\\usepackage[${geometry},top=14mm,bottom=18mm,left=14mm,right=14mm,footskip=8mm]{geometry}`);
  });

  it('is deterministic', async () => {
    const again = await buildExamTex(await twelveItemDraw(), { paper: 'a4', includeSolutions: true, qr: FAKE_QR });
    expect(again.files.map((f) => f.content)).toEqual(files.map((f) => f.content));
  });

  it('builds only the documents asked for', async () => {
    const { files: some } = await buildExamTex(draw, { documents: { paper: false, sheet: false, key: true }, qr: null });
    expect(some.map((f) => f.kind)).toEqual(['key']);
  });
});

describe('the question paper', () => {
  it('has one \\item per question, each section starting at its number', () => {
    const tex = file('paper').content;
    expect(countOf(tex, /^\\item /gm)).toBe(12);
    expect([...tex.matchAll(/start=(\d+),/g)].map((m) => Number(m[1]))).toEqual([1, 4, 8]);
    expect(tex).toContain('\\examsection{Part II -- Engineering Sciences and Allied Subjects (items 4--7)}');
    // Custom 3/4/5 at the board's pace: 540 + 576 + 1080 s, to 5 minutes.
    expect(tex).toContain('Time allotment: 40 minutes');
  });

  it('draws the figure box only on the item that mentions a figure', () => {
    const tex = file('paper').content;
    const items = tex.split(/^\\item /m).slice(1);
    const withBox = items.map((body, i) => [i + 1, /^\\examfigure$/m.test(body)]).filter(([, has]) => has).map(([n]) => n);
    expect(withBox).toEqual(draw.items.filter((it) => it.figure).map((it) => it.n));
  });

  it('lays options out by length', () => {
    expect(chooseOptionLayout(['1', '2', '3', '4'])).toEqual({ cols: 4, rows: 1 });
    expect(chooseOptionLayout(['1', '2', '3', '4', '5'])).toEqual({ cols: 3, rows: 2 });
    expect(chooseOptionLayout(['147 kWh', '151 kWh', '120 kWh', '135 kWh'])).toEqual({ cols: 2, rows: 2 });
    expect(chooseOptionLayout(['The first answer', 'The second answer', 'x', 'y'])).toEqual({ cols: 2, rows: 2 });
    expect(chooseOptionLayout(['A sentence long enough to need its own line', 'b'])).toEqual({ cols: 1, rows: 2 });
  });
});

describe('the answer sheet', () => {
  it('has one bubble row per item, each with exactly its own options\' letters', () => {
    const tex = file('sheet').content;
    const rows = [...tex.matchAll(/\\bubblerow\{[\d.]+\}\{[\d.]+\}\{(\d+)\}\{([A-Z,]*)\}/g)];
    expect(rows).toHaveLength(12);
    for (const [, n, letters] of rows) {
      const item = draw.items[Number(n) - 1];
      expect(letters.split(',')).toEqual(item.options.map((_, i) => String.fromCharCode(65 + i)));
    }
  });

  it('draws the set QR from its module matrix, or prints the payload without one', () => {
    expect(file('sheet').content).toContain('\\fill (');
    expect(qrTikz(FAKE_QR, 'x')).toMatch(/^\\begin\{tikzpicture\}/);
    const { content } = buildAnswerSheetTex(draw, { qr: null });
    expect(content).toContain(`\\texttt{REE\\textbar{}${draw.setId}\\textbar{}v${draw.keyVersion}}`);
  });

  it('continues a long sheet on further pages, dropping no row', async () => {
    const big = { ...draw, items: Array.from({ length: 300 }, (_, i) => ({ ...draw.items[i % 12], n: i + 1 })) };
    const { content, layout } = buildAnswerSheetTex(big, { qr: null });
    expect(layout.pages.length).toBeGreaterThan(1);
    expect(countOf(content, /\\bubblerow\{/g)).toBe(300);
    expect(countOf(content, /ANSWER SHEET \(continued\)/g)).toBe(layout.pages.length - 1);
  });
});

describe('the answer key', () => {
  it('prints the letter of each answer in the presented order', () => {
    const tex = file('key').content;
    const key = new Map([...tex.matchAll(/(\d+)\. & \\textbf\{([A-Z]|--)\}/g)].map((m) => [Number(m[1]), m[2]]));
    expect(key.size).toBe(12);
    for (const it of draw.items) {
      const expected = it.options.indexOf(it.answer) >= 0 ? 'ABCDEF'[it.options.indexOf(it.answer)] : '--';
      if (it.answerIndex >= 0) expect(key.get(it.n)).toBe('ABCDEF'[it.answerIndex]);
      else expect(key.get(it.n)).toBe('--');
      if (expected !== '--') expect(key.get(it.n)).toBe(expected);
    }
    expect(tex).toContain('The stored answer matches none of the options.');
  });

  it('shows the section ranges of a mixed paper', () => {
    expect(file('key').content).toContain('Part III -- Electrical Engineering Professional Subjects: items 8--12');
  });

  it('adds a worked solution per item, or says none is stored', () => {
    const tex = file('key').content;
    expect(countOf(tex, /^\\par\\medskip\\noindent\\textbf\{\d+\.\}~\\textsc\{/gm)).toBe(12);
    const missing = draw.items.filter((it) => !it.explanation).length;
    expect(missing).toBeGreaterThan(0);
    expect(countOf(tex, /No worked solution is stored for this item yet\./g)).toBe(missing);
    expect(buildAnswerKeyTex(draw, { includeSolutions: false }).content).not.toContain('Worked solutions');
  });
});

describe('the zip', () => {
  it('holds the three files and the README', async () => {
    const entries = unzipSync(await zipTexFiles(files));
    expect(Object.keys(entries).sort()).toEqual([...files.map((f) => f.name), 'README.txt'].sort());
    expect(strFromU8(entries['README.txt'])).toBe(README);
    expect(README).toContain('-no-shell-escape');
    expect(strFromU8(entries[file('paper').name])).toBe(file('paper').content);
  });
});
