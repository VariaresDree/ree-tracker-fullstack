// src/features/exam-export/buildExamTex.js
//
// An ExamDraw as three LaTeX documents: the question paper, the bubble answer
// sheet and the answer key (optionally with worked solutions). Each is a
// self-contained .tex file, ASCII only, so a single paste compiles.
import { stripChoicePrefix } from '@ree/shared';
import { createWarnings, ensureAscii, escapeText, shimLines } from './latexEscape';
import { markdownToLatex } from './markdownToLatex';
import { answerSheetLayout, pageCells } from './sheetLayout';
import {
  PRACTICE_LINE, applicantFields, bubbleRowMacro, bubbleRows, chooseOptionLayout, footerText,
  instructionsBox, keyTable, optionsBlock, preamble, prcHeader, qrTikz, solutionBlock,
} from './texTemplates';
import { formatDuration, formatPaperDate, paperDay, partLabel } from '../board-simulator/examPaper';
import { SHORT_LABEL } from './drawExamPaper';

const SUFFIX = { paper: 'questions', sheet: 'answer-sheet', key: 'key' };

// The sheet's geometry, matching the preamble (14 mm sides and top, 18 mm
// bottom). The header boxes are fixed heights, so the grid always fits.
const SHEET = { marginMm: 14, topMm: 14, bottomMm: 18, firstHeaderMm: 62, nextHeaderMm: 16 };
const SHEET_HEADER_BOX = { first: 56, next: 12 };
// Tighter bubbles, used only when they save a page (one 6-choice item would
// otherwise drop a 100-item sheet to three columns and a second page).
const SHEET_COMPACT = { bubblePitchMm: 5.4, colGapMm: 2.5, rowPitchMm: 6.2 };

/** The sheet layout: the standard one, or the compact one when it needs fewer pages. */
export function texSheetLayout({ count, maxOptions, paper }) {
  const standard = answerSheetLayout({ count, maxOptions, paper, ...SHEET });
  if (standard.pages.length <= 1) return standard;
  const compact = answerSheetLayout({ count, maxOptions, paper, ...SHEET, ...SHEET_COMPACT });
  return compact.pages.length < standard.pages.length ? compact : standard;
}

export const README = [
  PRACTICE_LINE,
  '',
  'Three LaTeX files: the question paper, the answer sheet and the answer key.',
  'Compile each one twice with pdflatex (the second run fills in "Page X of Y"),',
  'or run latexmk -pdf, or upload the files to Overleaf.',
  'Use -no-shell-escape: nothing here needs it.',
  '',
].join('\n');

/** REE-EE-SETB-2026-10-20-questions.tex */
export function texFileName(draw, kind) {
  return `REE-${draw.plan.code}-${draw.setLabel.replace(/\s+/g, '')}-${paperDay(draw.generatedAt)}-${SUFFIX[kind]}.tex`;
}

/** REE-EE-SETB-2026-10-20-latex.zip */
export function zipFileName(draw) {
  return `REE-${draw.plan.code}-${draw.setLabel.replace(/\s+/g, '')}-${paperDay(draw.generatedAt)}-latex.zip`;
}

const optionLatex = (o, ctx) => markdownToLatex(stripChoicePrefix(String(o ?? '')), { mode: 'inline', ctx });

function assemble({ draw, paper, ctx, body, extra = [] }) {
  const head = preamble({ paper, footer: footerText(draw), shims: shimLines(ctx), extra });
  return ensureAscii([head, '\\begin{document}', body, '\\end{document}', ''].join('\n'), ctx);
}

/** The question paper: PRC masthead, then the items in two columns. */
export function buildQuestionPaperTex(draw, { paper = 'a4' } = {}) {
  const ctx = createWarnings();
  const { plan } = draw;
  const sections = draw.sections.length ? draw.sections : [{ from: 1, to: draw.items.length, title: plan.title }];
  const showSections = plan.kind === 'blended' || sections.length > 1;
  const widest = String(draw.items.length);

  const parts = [
    prcHeader({
      title: plan.title,
      topic: plan.topic,
      date: formatPaperDate(draw.generatedAt),
      duration: formatDuration(plan.timeAllotmentMins),
      setLabel: draw.setLabel,
    }),
    applicantFields(),
    instructionsBox(),
    '\\setlength{\\columnsep}{6mm}\\setlength{\\columnseprule}{0.2pt}\\raggedcolumns',
  ];
  sections.forEach((section, index) => {
    if (showSections) {
      parts.push(`\\examsection{${partLabel(index)} -- ${escapeText(section.title)} (items ${section.from}--${section.to})}`);
    }
    const items = draw.items.filter((it) => it.n >= section.from && it.n <= section.to);
    const body = items.map((it) => {
      const stem = markdownToLatex(it.text, { mode: 'block', ctx }) || '\\mbox{}';
      const measured = [];
      const options = it.options.map((o, i) => {
        const before = ctx.demoted;
        const latex = optionLatex(o, ctx);
        if (ctx.demoted > before) measured[i] = String(o ?? '').length;
        return latex;
      });
      return [
        `\\item ${stem}`,
        ...(it.figure ? ['\\examfigure'] : []),
        '\\par\\nopagebreak[4]\\smallskip',
        optionsBlock(options, chooseOptionLayout(it.options, measured)),
      ].join('\n');
    });
    parts.push(
      '\\begin{multicols}{2}',
      `\\begin{enumerate}[label=\\textbf{\\arabic*.},leftmargin=*,widest=${widest},start=${section.from},itemsep=7pt,topsep=0pt]`,
      body.join('\n\n'),
      '\\end{enumerate}',
      '\\end{multicols}',
    );
  });
  return { content: assemble({ draw, paper, ctx, body: parts.join('\n') }), ctx };
}

/** The bubble answer sheet: header box, then the grid page by page. */
export function buildAnswerSheetTex(draw, { paper = 'a4', qr = null } = {}) {
  const ctx = createWarnings();
  const { plan } = draw;
  const counts = draw.items.map((it) => it.options.length);
  const layout = texSheetLayout({ count: draw.items.length, maxOptions: Math.max(2, ...counts), paper });
  const setLine = escapeText(`Set ${draw.setId} -- Key v${draw.keyVersion}`).replace('-{}-', '--');
  const firstHeader = [
    `\\noindent\\begin{minipage}[t][${SHEET_HEADER_BOX.first}mm][t]{\\linewidth}`,
    '\\vspace{0pt}',
    '\\begin{minipage}[t]{\\dimexpr\\linewidth-30mm\\relax}',
    '\\vspace{0pt}',
    '{\\LARGE\\bfseries ANSWER SHEET}\\par\\smallskip',
    '{\\small Registered Electrical Engineer Pre-board Examination}\\par',
    `{\\small\\bfseries ${escapeText(plan.title)}}\\par`,
    `{\\footnotesize\\itshape ${PRACTICE_LINE}}\\par\\medskip`,
    `\\fbox{\\Large\\bfseries\\strut~${escapeText(draw.setLabel)}~}\\quad{\\footnotesize ${setLine}}`,
    '\\end{minipage}\\hfill',
    '\\begin{minipage}[t]{26mm}',
    '\\vspace{0pt}\\raggedleft',
    qrTikz(qr, draw.qrPayload),
    '\\par\\vspace{1mm}{\\tiny Scan to verify the set}',
    '\\end{minipage}',
    applicantFields([['Name', 'Application no.'], ['Seat no.', 'Date'], ['Signature', '']]),
    '\\par\\medskip',
    '{\\footnotesize Shade one circle per item completely with a No. 2 pencil. Strictly no erasures.}',
    '\\end{minipage}',
  ].join('\n');

  const pages = layout.pages.map((page, p) => {
    const header = p === 0 ? firstHeader : [
      '\\newpage',
      `\\noindent\\begin{minipage}[t][${SHEET_HEADER_BOX.next}mm][t]{\\linewidth}`,
      '\\vspace{0pt}',
      `{\\large\\bfseries ANSWER SHEET (continued)}\\hfill\\fbox{\\bfseries ${escapeText(draw.setLabel)}}\\par\\smallskip`,
      `{\\footnotesize Items ${page.from}--${page.to}\\qquad Name:~\\makebox[70mm]{\\hrulefill}}`,
      '\\end{minipage}',
    ].join('\n');
    return [
      header,
      '\\par\\nointerlineskip',
      `\\vspace{${p === 0 ? SHEET.firstHeaderMm - SHEET_HEADER_BOX.first - 4 : SHEET.nextHeaderMm - SHEET_HEADER_BOX.next - 4}mm}`,
      bubbleRows(layout, page, pageCells(layout, page), counts),
    ].join('\n');
  });

  const body = ['\\setlength{\\parskip}{0pt}', ...pages].join('\n');
  return { content: assemble({ draw, paper, ctx, body, extra: [bubbleRowMacro(layout.bubblePitchMm)] }), ctx, layout };
}

/** The answer key, then (optionally) a worked solution per item. */
export function buildAnswerKeyTex(draw, { paper = 'a4', includeSolutions = false } = {}) {
  const ctx = createWarnings();
  const { plan } = draw;
  const showSections = plan.kind === 'blended' || draw.sections.length > 1;
  const parts = [
    `{\\LARGE\\bfseries ANSWER KEY}\\hfill\\fbox{\\Large\\bfseries\\strut~${escapeText(draw.setLabel)}~}\\par\\smallskip`,
    `{\\small Registered Electrical Engineer Pre-board Examination -- ${escapeText(plan.title)}}\\par`,
    `{\\small ${draw.items.length} items. ${escapeText(`Set ${draw.setId}`)} -- ${escapeText(`Key v${draw.keyVersion}`)}. `
      + 'Scan the answer-sheet QR to confirm a sheet matches this key.}\\par',
    `{\\footnotesize\\itshape ${PRACTICE_LINE}}\\par`,
  ];
  if (showSections) {
    parts.push(`\\par\\smallskip{\\small ${draw.sections
      .map((s, i) => `${partLabel(i)} -- ${escapeText(s.title)}: items ${s.from}--${s.to}`).join('\\\\\n')}}\\par`);
  }
  parts.push('\\section*{Answer key}', keyTable(draw.items));
  if (draw.items.some((it) => !(it.answerIndex >= 0))) {
    parts.push('\\par\\smallskip{\\footnotesize\\textsuperscript{*}The stored answer matches none of the options. '
      + 'Check the item in the question bank.}\\par');
  }
  if (includeSolutions) {
    parts.push('\\section*{Worked solutions}');
    for (const it of draw.items) {
      parts.push(solutionBlock(it, {
        subjectLabel: SHORT_LABEL[it.subject] || it.subject,
        optionLatex: it.answerIndex >= 0 ? optionLatex(it.options[it.answerIndex], ctx) : '',
        answerLatex: optionLatex(it.answer, ctx) || '\\emph{none}',
        explanationLatex: it.explanation ? markdownToLatex(it.explanation, { mode: 'block', ctx }) : '',
      }));
    }
  }
  return { content: assemble({ draw, paper, ctx, body: parts.join('\n') }), ctx };
}

/** The QR module matrix for a payload, or null (the sheet then prints the text). */
export async function loadQrModules(payload) {
  try {
    const mod = await import('qrcode');
    const create = mod.create || mod.default?.create;
    return create ? create(payload, { errorCorrectionLevel: 'M' }).modules : null;
  } catch {
    return null;
  }
}

/** Warnings across documents, for the dialog. */
export function mergeWarnings(ctxs) {
  const glyphs = new Set();
  ctxs.forEach((c) => c.glyphs.forEach((g) => glyphs.add(g)));
  const max = (key) => ctxs.reduce((m, c) => Math.max(m, c[key] || 0), 0);
  return {
    unknownGlyphs: max('unknownGlyphs'),
    glyphs: [...glyphs].sort(),
    demoted: max('demoted'),
    unbalancedFields: max('unbalancedFields'),
  };
}

/** The tex warnings as sentences for the dialog. */
export function texWarningLines(w) {
  const lines = [];
  if (!w) return lines;
  if (w.unknownGlyphs) lines.push(`${w.unknownGlyphs} character${w.unknownGlyphs === 1 ? '' : 's'} with no LaTeX form print${w.unknownGlyphs === 1 ? 's' : ''} as "?" (${w.glyphs.slice(0, 5).join(', ')}).`);
  if (w.demoted) lines.push(`${w.demoted} formula${w.demoted === 1 ? '' : 's'} couldn't be converted safely and print${w.demoted === 1 ? 's' : ''} as plain text.`);
  if (w.unbalancedFields) lines.push(`${w.unbalancedFields} field${w.unbalancedFields === 1 ? ' leaves' : 's leave'} a $ open, so ${w.unbalancedFields === 1 ? 'it prints' : 'they print'} as plain text.`);
  return lines;
}

const texFile = (kind, draw, content) => ({ kind, name: texFileName(draw, kind), content, bytes: content.length });

/**
 * The chosen documents as .tex files.
 * @param {object} draw  an ExamDraw
 * @param {{ paper?: string, documents?: { paper?: boolean, sheet?: boolean, key?: boolean },
 *   includeSolutions?: boolean, qr?: object|null }} [opts]  qr: a module matrix; omitted = drawn from qrcode
 * @returns {Promise<{ files: { kind: string, name: string, content: string, bytes: number }[], warnings: object }>}
 */
export async function buildExamTex(draw, {
  paper = 'a4',
  documents = { paper: true, sheet: true, key: true },
  includeSolutions = false,
  qr,
} = {}) {
  const files = [];
  const ctxs = [];
  if (documents.paper) {
    const { content, ctx } = buildQuestionPaperTex(draw, { paper });
    files.push(texFile('paper', draw, content));
    ctxs.push(ctx);
  }
  if (documents.sheet) {
    const modules = qr === undefined ? await loadQrModules(draw.qrPayload) : qr;
    const { content, ctx } = buildAnswerSheetTex(draw, { paper, qr: modules });
    files.push(texFile('sheet', draw, content));
    ctxs.push(ctx);
  }
  if (documents.key) {
    const { content, ctx } = buildAnswerKeyTex(draw, { paper, includeSolutions });
    files.push(texFile('key', draw, content));
    ctxs.push(ctx);
  }
  return { files, warnings: mergeWarnings(ctxs) };
}

/** The files and the README as one .zip (fflate, loaded on demand). */
export async function zipTexFiles(files) {
  const { zipSync, strToU8 } = await import('fflate');
  const entries = {};
  for (const f of files) entries[f.name] = strToU8(f.content);
  entries['README.txt'] = strToU8(README);
  return zipSync(entries, { level: 6 });
}
