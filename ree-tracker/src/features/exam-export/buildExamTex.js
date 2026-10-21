// src/features/exam-export/buildExamTex.js
//
// An ExamDraw (or a printed set's effectiveDraw, edits applied) as ONE
// self-contained LaTeX file: one preamble, then the chosen parts in order
// (question paper, answer sheet, answer key with optional worked solutions),
// each numbering its own pages. ASCII only, so a single paste compiles, and
// "Open in Overleaf" can send it as one snippet.
//
// The answer sheet is the scannable one: a TikZ overlay per page placed from
// answerSheetGeometry (via sheetGeometryFor), the same positions the print
// preview draws and the scanner reads.
import { stripChoicePrefix } from '@ree/shared';
import { createWarnings, ensureAscii, escapeText, shimLines } from './latexEscape';
import { markdownToLatex } from './markdownToLatex';
import { PAPER_SIZES } from './sheetLayout';
import {
  chooseOptionLayout, formatDuration, formatPaperDate, loadQrEncoder, paperDay, partLabel, setCodeFor, sheetGeometryFor,
} from './paperFormat';
import {
  PRACTICE_LINE, answerSheetPage, applicantFields, footerText, instructionsBox, keyTable, optionsBlock, preamble,
  prcHeader, solutionBlock,
} from './texTemplates';
import { SHORT_LABEL } from './drawExamPaper';

export { loadQrEncoder, loadQrModules } from './paperFormat';

/** The parts, in print order. */
export const TEX_PARTS = ['paper', 'sheet', 'key'];
const ALL_DOCUMENTS = { paper: true, sheet: true, key: true };
const PART_NAME = { paper: 'the question paper', sheet: 'the answer sheet', key: 'the answer key' };

const setTag = (draw) => String(draw.setLabel || '').replace(/\s+/g, '');

/** REE-EE-SETB-2026-10-20.tex */
export function texDocumentName(draw) {
  return `REE-${draw.plan?.code || 'EE'}-${setTag(draw)}-${paperDay(draw.generatedAt)}.tex`;
}

const optionLatex = (o, ctx) => markdownToLatex(stripChoicePrefix(String(o ?? '')), { mode: 'inline', ctx });

/** The question paper: PRC masthead, then the items in two columns. */
function questionPaperPart(draw, ctx) {
  const { plan } = draw;
  const sections = draw.sections?.length ? draw.sections : [{ from: 1, to: draw.items.length, title: plan.title }];
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
  return parts.join('\n');
}

const qrEncoderOf = (qr) => {
  if (typeof qr === 'function') return qr;
  if (qr && typeof qr.get === 'function') return () => qr;
  return () => null;
};

/** The answer sheet: one TikZ overlay per geometry page. */
function answerSheetPart(geometry, encode, ctx) {
  return geometry.pages
    .map((page) => answerSheetPage(page, geometry, { modules: encode(page.qr.payload), ctx }))
    .join('\n\\newpage\n');
}

/** The answer key, then (optionally) a worked solution per item. */
function answerKeyPart(draw, ctx, { includeSolutions, setCode }) {
  const { plan } = draw;
  const sections = draw.sections || [];
  const showSections = plan.kind === 'blended' || sections.length > 1;
  const setRef = setCode ? `Set code ${setCode}` : `Set ${draw.setId}`;
  const parts = [
    `{\\LARGE\\bfseries ANSWER KEY}\\hfill\\fbox{\\Large\\bfseries\\strut~${escapeText(draw.setLabel)}~}\\par\\smallskip`,
    `{\\small Registered Electrical Engineer Pre-board Examination -- ${escapeText(plan.title)}}\\par`,
    `{\\small ${draw.items.length} items. ${escapeText(setRef)} -- ${escapeText(`Key v${draw.keyVersion}`)}. `
      + 'Scan the answer-sheet QR to confirm a sheet matches this key.}\\par',
    `{\\footnotesize\\itshape ${PRACTICE_LINE}}\\par`,
  ];
  if (showSections) {
    parts.push(`\\par\\smallskip{\\small ${sections
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
  return parts.join('\n');
}

const listOf = (names) => (names.length < 3
  ? names.join(' and ')
  : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

function headerComments(kinds, { paper, setCode }) {
  const what = listOf(kinds.map((k) => PART_NAME[k]));
  return [
    `One file: ${what}. Each part numbers its own pages.`,
    'Compile it twice with pdflatex (the second run fills in "Page X of Y" and puts',
    'the answer sheet\'s marks in place), or run latexmk -pdf, or open it in Overleaf.',
    'Use -no-shell-escape: nothing here needs it.',
    `Paper: ${PAPER_SIZES[paper].label}.${setCode ? ` Set code ${setCode}.` : ''}`,
  ];
}

/**
 * The chosen parts as one .tex file, synchronously. `qr` must already be in
 * hand: an encoder (payload => module matrix, from loadQrEncoder), one module
 * matrix used on every sheet page, or null to print each page's QR payload as
 * text. Throws when no part is chosen or the draw has no items.
 * @param {object} draw  an ExamDraw; may carry `printId`, `paper` and edited items
 * @param {{ paper?: 'a4'|'letter'|'long', documents?: { paper?: boolean, sheet?: boolean, key?: boolean },
 *   includeSolutions?: boolean, qr?: Function|object|null, printId?: string, setCode?: string }} [opts]
 *   paper and printId default to the draw's; setCode defaults to the formatted printId
 * @returns {{ name: string, content: string, bytes: number, warnings: object, parts: string[], geometry: object|null }}
 */
export function buildExamTexDocumentSync(draw, {
  paper,
  documents = ALL_DOCUMENTS,
  includeSolutions = false,
  qr = null,
  printId,
  setCode,
} = {}) {
  if (!draw || !Array.isArray(draw.items) || draw.items.length === 0) throw new Error('No questions to print.');
  const kinds = TEX_PARTS.filter((k) => documents?.[k]);
  if (!kinds.length) throw new Error('Choose at least one part to print.');
  const size = PAPER_SIZES[paper || draw.paper] ? (paper || draw.paper) : 'a4';
  const id = printId ?? draw.printId ?? '';
  const code = setCode ?? setCodeFor(id);
  const ctx = createWarnings();
  const geometry = kinds.includes('sheet') ? sheetGeometryFor(draw, { paper: size, printId: id, setCode: code }) : null;
  const encode = qrEncoderOf(qr);

  const body = kinds.map((kind) => {
    let part;
    if (kind === 'paper') part = questionPaperPart(draw, ctx);
    else if (kind === 'sheet') part = answerSheetPart(geometry, encode, ctx);
    else part = answerKeyPart(draw, ctx, { includeSolutions, setCode: code });
    return [`\\reepart{${kind}}`, part, `\\reeendpart{${kind}}`].join('\n');
  });

  const head = preamble({
    paper: size,
    footer: footerText(draw, code),
    shims: shimLines(ctx),
    comments: headerComments(kinds, { paper: size, setCode: code }),
  });
  const content = ensureAscii([head, '\\begin{document}', ...body, '\\end{document}', ''].join('\n'), ctx);
  return {
    name: texDocumentName(draw),
    content,
    bytes: content.length,
    warnings: mergeWarnings([ctx]),
    parts: kinds,
    geometry,
  };
}

/**
 * The chosen parts as one .tex file. With `qr` left out, each answer-sheet
 * page's QR is drawn from the qrcode package (loaded on demand).
 * @param {object} draw  an ExamDraw; may carry `printId`, `paper` and edited items
 * @param {{ paper?: 'a4'|'letter'|'long', documents?: { paper?: boolean, sheet?: boolean, key?: boolean },
 *   includeSolutions?: boolean, qr?: Function|object|null, printId?: string, setCode?: string }} [opts]
 * @returns {Promise<{ name: string, content: string, bytes: number, warnings: object, parts: string[], geometry: object|null }>}
 */
export async function buildExamTexDocument(draw, opts = {}) {
  const wantsSheet = (opts.documents || ALL_DOCUMENTS).sheet;
  const qr = opts.qr === undefined ? (wantsSheet ? await loadQrEncoder() : null) : opts.qr;
  return buildExamTexDocumentSync(draw, { ...opts, qr });
}

/** Warnings across documents (collectors or earlier results), for the UI. */
export function mergeWarnings(ctxs) {
  const glyphs = new Set();
  ctxs.forEach((c) => (c.glyphs || []).forEach((g) => glyphs.add(g)));
  const max = (key) => ctxs.reduce((m, c) => Math.max(m, c[key] || 0), 0);
  return {
    unknownGlyphs: max('unknownGlyphs'),
    glyphs: [...glyphs].sort(),
    demoted: max('demoted'),
    unbalancedFields: max('unbalancedFields'),
  };
}

/** The tex warnings as sentences. */
export function texWarningLines(w) {
  const lines = [];
  if (!w) return lines;
  if (w.unknownGlyphs) lines.push(`${w.unknownGlyphs} character${w.unknownGlyphs === 1 ? '' : 's'} with no LaTeX form print${w.unknownGlyphs === 1 ? 's' : ''} as "?" (${w.glyphs.slice(0, 5).join(', ')}).`);
  if (w.demoted) lines.push(`${w.demoted} formula${w.demoted === 1 ? '' : 's'} couldn't be converted safely and print${w.demoted === 1 ? 's' : ''} as plain text.`);
  if (w.unbalancedFields) lines.push(`${w.unbalancedFields} field${w.unbalancedFields === 1 ? ' leaves' : 's leave'} a $ open, so ${w.unbalancedFields === 1 ? 'it prints' : 'they print'} as plain text.`);
  return lines;
}

// --- the old three-file export (ExportDialog), until the dialog is deleted ----
// Each file is the one-file document with a single part.

const SUFFIX = { paper: 'questions', sheet: 'answer-sheet', key: 'key' };

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
  return `REE-${draw.plan.code}-${setTag(draw)}-${paperDay(draw.generatedAt)}-${SUFFIX[kind]}.tex`;
}

/** REE-EE-SETB-2026-10-20-latex.zip */
export function zipFileName(draw) {
  return `REE-${draw.plan.code}-${setTag(draw)}-${paperDay(draw.generatedAt)}-latex.zip`;
}

/**
 * The chosen documents as separate .tex files (the old dialog's export).
 * @returns {Promise<{ files: { kind: string, name: string, content: string, bytes: number }[], warnings: object }>}
 */
export async function buildExamTex(draw, {
  paper = 'a4',
  documents = ALL_DOCUMENTS,
  includeSolutions = false,
  qr,
} = {}) {
  const encode = qr === undefined ? (documents.sheet ? await loadQrEncoder() : null) : qr;
  const files = [];
  const warnings = [];
  for (const kind of TEX_PARTS) {
    if (!documents[kind]) continue;
    const doc = buildExamTexDocumentSync(draw, { paper, documents: { [kind]: true }, includeSolutions, qr: encode });
    files.push({ kind, name: texFileName(draw, kind), content: doc.content, bytes: doc.bytes });
    warnings.push(doc.warnings);
  }
  return { files, warnings: mergeWarnings(warnings) };
}

/** The files and the README as one .zip (fflate, loaded on demand). */
export async function zipTexFiles(files) {
  const { zipSync, strToU8 } = await import('fflate');
  const entries = {};
  for (const f of files) entries[f.name] = strToU8(f.content);
  entries['README.txt'] = strToU8(README);
  return zipSync(entries, { level: 6 });
}
