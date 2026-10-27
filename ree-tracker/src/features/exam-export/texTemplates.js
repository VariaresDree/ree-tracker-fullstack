// src/features/exam-export/texTemplates.js
//
// The LaTeX pieces a paper is built from: one preamble, then the question
// paper, the answer sheet and the answer key as parts of one file. Only
// standard packages: pdflatex on TeX Live 2020 or later, or Overleaf,
// compiles the file as it is.
//
// The answer sheet is not laid out by TeX: every square, bubble, letter, box
// and line of text is placed at absolute page millimetres from
// answerSheetGeometry (sheetLayout.js), the same geometry the print preview
// draws and the scanner reads, in a TikZ overlay on an otherwise empty page.
import { escapeText } from './latexEscape';
import { OMR_SPEC, paperSize } from './sheetLayout';
import { PRACTICE_LINE, letterOf } from './paperFormat';

export { PRACTICE_LINE, chooseOptionLayout } from './paperFormat';

// KaTeX accepts these and pdflatex doesn't know them. \providecommand never
// overrides a definition the reader's TeX already has.
const KATEX_SHIMS = [
  '\\providecommand{\\degree}{\\ensuremath{^{\\circ}}}\\providecommand{\\ohm}{\\ensuremath{\\Omega}}\\providecommand{\\micro}{\\ensuremath{\\mu}}',
  '\\providecommand{\\celsius}{\\ensuremath{^{\\circ}\\mathrm{C}}}\\providecommand{\\phase}[1]{\\angle{#1}}',
  '\\providecommand{\\R}{\\mathbb{R}}\\providecommand{\\N}{\\mathbb{N}}\\providecommand{\\Z}{\\mathbb{Z}}',
  '\\providecommand{\\lt}{<}\\providecommand{\\gt}{>}\\providecommand{\\rarr}{\\rightarrow}\\providecommand{\\larr}{\\leftarrow}',
  '\\providecommand{\\Rarr}{\\Rightarrow}\\providecommand{\\lrarr}{\\leftrightarrow}\\providecommand{\\omicron}{o}',
  '\\providecommand{\\mathscr}{\\mathcal}\\providecommand{\\Bbb}{\\mathbb}\\providecommand{\\coloneqq}{\\mathrel{:}=}',
  ...['sech', 'csch', 'arcsec', 'arccsc', 'arccot']
    .map((op) => `\\ifdefined\\${op}\\else\\DeclareMathOperator{\\${op}}{${op}}\\fi`),
];

// The peso sign: a P with two bars through its bowl (no standard T1 glyph).
const PESO = '\\providecommand{\\peso}{\\kern.08em\\makebox[0pt][l]{\\hspace{-.08em}\\rule[1.02ex]{.66em}{.055ex}}'
  + '\\makebox[0pt][l]{\\hspace{-.08em}\\rule[.8ex]{.66em}{.055ex}}P}';

/**
 * Each part numbers its own pages ("Page 2 of 5" on the question paper, then
 * "Page 1 of 1" on the key). \reepart starts a part on a fresh page 1;
 * \reeendpart ends it and records its last page under reelast:<part>, which
 * the footer reads back on the second run. The record is written after the
 * part's last page has shipped, so it can never land on a page of its own.
 */
export const PART_MACROS = [
  '\\newcommand{\\reelast}{}',
  '\\newcommand{\\reepart}[1]{\\clearpage\\setcounter{page}{1}\\renewcommand{\\reelast}{reelast:#1}}',
  '\\makeatletter',
  '\\newcommand{\\reeendpart}[1]{\\clearpage\\immediate\\write\\@auxout{\\string\\newlabel{reelast:#1}{{}{\\the\\numexpr\\value{page}-1\\relax}}}}',
  '\\makeatother',
];

/**
 * The preamble of the one file.
 * @param {{ paper: string, footer: string, shims?: string[], comments?: string[] }} opts
 *   footer: the left footer, already escaped; comments: header comment lines
 */
export function preamble({ paper, footer, shims = [], comments = [] }) {
  const size = paperSize(paper);
  return [
    '\\documentclass[10pt]{article}',
    `% ${PRACTICE_LINE}`,
    ...comments.map((line) => (line ? `% ${line}` : '%')),
    '\\usepackage[T1]{fontenc}',
    '\\IfFileExists{lmodern.sty}{\\usepackage{lmodern}}{}',
    `\\usepackage[${size.geometry},top=14mm,bottom=18mm,left=14mm,right=14mm,footskip=8mm]{geometry}`,
    '\\usepackage{amsmath,amssymb,bm,array,tabularx,longtable,multicol,enumitem,graphicx,xcolor,tikz,fancyhdr}',
    '\\IfFileExists{cancel.sty}{\\usepackage{cancel}}{\\providecommand{\\cancel}[1]{#1}\\providecommand{\\bcancel}[1]{#1}'
      + '\\providecommand{\\xcancel}[1]{#1}\\providecommand{\\cancelto}[2]{#2}}',
    '% KaTeX names',
    ...KATEX_SHIMS,
    PESO,
    ...(shims.length ? ['% Macros the question bank uses that this file has no definition for', ...shims] : []),
    '\\newsavebox{\\fitbox}',
    // A display formula: centred when it fits, scaled down when it is a little
    // too wide, and set as a breakable line (it can wrap after + and =) when
    // scaling would make it unreadable.
    '\\newcommand{\\fitdisplay}[1]{\\par\\smallskip\\noindent\\sbox{\\fitbox}{$\\displaystyle #1$}%',
    '  \\ifdim\\wd\\fitbox>1.6\\linewidth{\\raggedright$\\displaystyle #1$\\par}%',
    '  \\else\\ifdim\\wd\\fitbox>\\linewidth\\resizebox{\\linewidth}{!}{\\usebox{\\fitbox}}%',
    '  \\else\\makebox[\\linewidth][c]{\\usebox{\\fitbox}}\\fi\\fi\\par\\smallskip}',
    // The figure box stays with its stem and options (no column break).
    '\\newcommand{\\examfigure}{\\par\\nopagebreak[4]\\smallskip\\noindent\\fbox{\\parbox[c][2.6cm][c]{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}'
      + '{\\centering\\footnotesize Figure not in the question bank.}}\\par\\nopagebreak[4]\\smallskip}',
    '\\newcommand{\\examsection}[1]{\\par\\medskip\\noindent{\\large\\bfseries #1}\\par\\nopagebreak\\smallskip}',
    // An option: its letter in a fixed box, wrapped lines hang under the text.
    '\\newcommand{\\opt}[2]{\\hangindent=1.85em\\hangafter=1\\noindent\\makebox[1.85em][l]{(#1)}\\ignorespaces#2}',
    // Sheet text at most #1 wide: scaled down, never wrapped, if it is wider.
    '\\newsavebox{\\reefitbox}',
    '\\newcommand{\\reefit}[2]{\\sbox{\\reefitbox}{#2}\\ifdim\\wd\\reefitbox>#1\\relax\\resizebox{#1}{!}{\\usebox{\\reefitbox}}\\else\\usebox{\\reefitbox}\\fi}',
    ...PART_MACROS,
    '\\pagestyle{fancy}\\fancyhf{}\\renewcommand{\\headrulewidth}{0pt}',
    `\\fancyfoot[L]{\\scriptsize\\color{black!60}${footer}}`,
    '\\fancyfoot[R]{\\scriptsize Page \\thepage\\ of \\pageref{\\reelast}}',
    '\\setlength{\\parindent}{0pt}',
    '\\setlength{\\parskip}{0.4ex plus 0.2ex}',
    // Narrow columns: stretch spaces a little rather than run into the margin.
    '\\setlength{\\emergencystretch}{1.5em}',
  ].join('\n');
}

/**
 * The left footer, escaped: "REE Pre-board . EE . SET B . Set code K7P2-9QXA-M3TD"
 * for a saved set, or (no set code) the content id and key version.
 */
export function footerText(draw, setCode = '') {
  const parts = ['REE Pre-board', draw.plan?.code, draw.setLabel];
  if (setCode) parts.push(`Set code ${setCode}`);
  else parts.push(`Set ${draw.setId}`, `Key v${draw.keyVersion}`);
  return parts.filter(Boolean).map((part) => escapeText(part)).join(' \\textperiodcentered{} ');
}

/** The PRC-style masthead of the question paper. */
export function prcHeader({ title, topic, date, duration, setLabel }) {
  return [
    '\\begin{center}',
    '{\\small Republic of the Philippines}\\par',
    '{\\large\\bfseries PROFESSIONAL REGULATION COMMISSION}\\par',
    '{\\small Manila}\\par\\smallskip',
    '{\\bfseries BOARD OF ELECTRICAL ENGINEERING}\\par',
    '{\\small Registered Electrical Engineer Pre-board Examination}\\par\\medskip',
    `{\\Large\\bfseries ${escapeText(title)}}\\par`,
    ...(topic ? [`{\\small Topic: ${escapeText(topic)}}\\par`] : []),
    '\\smallskip',
    `{\\footnotesize\\itshape ${PRACTICE_LINE}}\\par`,
    '\\end{center}',
    '\\vspace{-1ex}',
    '\\noindent\\begin{tabularx}{\\linewidth}{@{}>{\\raggedright\\arraybackslash}X>{\\centering\\arraybackslash}X>{\\raggedleft\\arraybackslash}X@{}}',
    `\\small ${escapeText(date)} & \\small Time allotment: ${escapeText(duration)} & \\fbox{\\large\\bfseries\\strut~${escapeText(setLabel)}~}\\\\`,
    '\\end{tabularx}',
  ].join('\n');
}

/** Name, Application no., Seat no. and Signature lines. */
export function applicantFields(fields = [['Name', 'Application no.'], ['Seat no.', 'Signature']]) {
  const rows = fields.map(([a, b]) => `${a}:~\\hrulefill & ${b ? `${b}:~\\hrulefill` : ''}`);
  return [
    '\\par\\medskip\\noindent\\begin{tabularx}{\\linewidth}{@{}X@{\\hspace{6mm}}X@{}}',
    rows.join(' \\\\[9pt]\n'),
    '\\end{tabularx}',
  ].join('\n');
}

export function instructionsBox(text = 'Choose the one best answer. Shade the circle of your answer on the answer sheet with a No. 2 pencil. Strictly no erasures.') {
  return [
    '\\par\\medskip\\noindent\\fbox{\\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\small\\textbf{INSTRUCTIONS.} '
      + `${escapeText(text)}}}`,
    '\\par\\medskip',
  ].join('\n');
}

/** Options (already LaTeX) in the chosen layout (chooseOptionLayout), column-major. */
export function optionsBlock(latexOptions, layout) {
  const n = latexOptions.length;
  if (!n) return '';
  if (layout.cols <= 1) {
    return latexOptions.map((o, i) => `\\opt{${letterOf(i)}}{${o}}`).join('\\par\n');
  }
  const rows = Math.ceil(n / layout.cols);
  const lines = [`{\\setlength{\\tabcolsep}{3pt}\\noindent\\begin{tabularx}{\\linewidth}{@{}*{${layout.cols}}{>{\\raggedright\\arraybackslash}X}@{}}`];
  for (let r = 0; r < rows; r += 1) {
    const cells = [];
    for (let c = 0; c < layout.cols; c += 1) {
      const i = c * rows + r;
      cells.push(i < n ? `\\opt{${letterOf(i)}}{${latexOptions[i]}}` : '');
    }
    lines.push(`${cells.join(' & ')} \\\\`);
  }
  lines.push('\\end{tabularx}\\par}');
  return lines.join('\n');
}

// --- the answer sheet ---------------------------------------------------------

/** A length in mm as TikZ reads it: at most 3 decimals, no trailing zeros. */
export const mm = (v) => String(Number(Number(v).toFixed(3)));

/**
 * The dark modules of a QR matrix ({ size, get(row, col) }) as horizontal
 * runs: [{ row, from, to }] with `to` exclusive. Empty without a matrix.
 */
export function qrModuleRuns(modules) {
  if (!modules || !modules.size || typeof modules.get !== 'function') return [];
  const n = modules.size;
  const runs = [];
  for (let r = 0; r < n; r += 1) {
    let start = -1;
    for (let c = 0; c <= n; c += 1) {
      const dark = c < n && !!modules.get(r, c);
      if (dark && start < 0) start = c;
      if (!dark && start >= 0) {
        runs.push({ row: r, from: start, to: c });
        start = -1;
      }
    }
  }
  return runs;
}

const ANCHOR = { start: 'base west', middle: 'base', end: 'base east' };
const fontOf = (pt, extra = '') => `\\fontsize{${pt}}{${Number((pt * 1.2).toFixed(2))}}\\selectfont${extra}`;

// How wide a line of sheet text may run before it is scaled down: up to the
// QR beside it, the ID strip below it, its own box, or the content margin.
function textRoom(t, page, geo, margin) {
  const { qr } = page;
  if (t.box) return t.box.w - 2;
  if (t.anchor === 'end') {
    const strip = page.idCells.length ? page.idCells[page.idCells.length - 1] : null;
    const besideStrip = strip && t.y >= strip.y - 1 && t.y <= strip.y + strip.size + 3;
    return t.x - (besideStrip ? strip.x + strip.size + 3 : margin);
  }
  if (t.anchor === 'middle') return 2 * Math.min(t.x - margin, geo.w - margin - t.x);
  const besideQr = t.y >= qr.y - 1 && t.y <= qr.y + qr.size + 3;
  return (besideQr ? qr.x - 2 : geo.w - margin) - t.x;
}

/**
 * One answer-sheet page as a TikZ overlay at absolute page mm (x right, y
 * down from the top-left corner), drawn from the geometry and nothing else:
 * corner squares, QR, header and footer text, the name and date boxes, item
 * numbers, bubbles with their letters, and the ID strip. The page has no
 * header or footer of its own (\thispagestyle{empty}).
 * @param {object} page  one of answerSheetGeometry(...).pages
 * @param {object} geo   the geometry (for w, h)
 * @param {{ modules?: object|null, ctx?: object, margin?: number }} [opts]
 *   modules: the QR matrix for this page's payload; without one the payload prints as text
 */
export function answerSheetPage(page, geo, { modules = null, ctx, margin = OMR_SPEC.content } = {}) {
  const lines = [
    `% Answer sheet, page ${page.index + 1} of ${page.count}: page mm from the top-left corner`,
    '\\thispagestyle{empty}%',
    '\\noindent\\begin{tikzpicture}[remember picture,overlay,x=1mm,y=-1mm,shift={(current page.north west)}]',
    '% corner squares',
  ];
  const half = page.fiducialSize / 2;
  for (const f of page.fiducials) {
    lines.push(`\\fill (${mm(f.x - half)},${mm(f.y - half)}) rectangle (${mm(f.x + half)},${mm(f.y + half)});`);
  }

  const { qr } = page;
  lines.push('% QR code');
  const runs = qrModuleRuns(modules);
  if (runs.length) {
    const u = qr.size / modules.size;
    for (const run of runs) {
      lines.push(`\\fill (${mm(qr.x + run.from * u)},${mm(qr.y + run.row * u)}) rectangle (${mm(qr.x + run.to * u)},${mm(qr.y + (run.row + 1) * u)});`);
    }
  } else {
    const text = String(qr.payload).split(':').map((s) => escapeText(s, ctx)).join(':\\allowbreak{}');
    lines.push(`\\draw[line width=.4pt] (${mm(qr.x)},${mm(qr.y)}) rectangle (${mm(qr.x + qr.size)},${mm(qr.y + qr.size)});`);
    lines.push(`\\node[align=center,text width=${mm(qr.size - 2)}mm,inner sep=0pt,font=${fontOf(5, '\\ttfamily')}] at (${mm(qr.x + qr.size / 2)},${mm(qr.y + qr.size / 2)}) {${text}};`);
  }

  lines.push('% header and footer');
  for (const t of page.text) {
    if (t.box) lines.push(`\\draw[line width=.6pt] (${mm(t.box.x)},${mm(t.box.y)}) rectangle (${mm(t.box.x + t.box.w)},${mm(t.box.y + t.box.h)});`);
    if (!t.str) continue;
    const style = `${t.weight === 'bold' ? '\\bfseries' : ''}${t.italic ? '\\itshape' : ''}`;
    const room = Math.max(5, textRoom(t, page, geo, margin));
    lines.push(`\\node[anchor=${ANCHOR[t.anchor] || ANCHOR.start},inner sep=0pt,font=${fontOf(t.size, style)}] at (${mm(t.x)},${mm(t.y)}) {\\reefit{${mm(room)}mm}{${escapeText(t.str, ctx)}}};`);
  }

  lines.push('% name and date boxes');
  for (const box of [page.nameBox, page.dateBox].filter(Boolean)) {
    lines.push(`\\draw[line width=.5pt] (${mm(box.x)},${mm(box.y)}) rectangle (${mm(box.x + box.w)},${mm(box.y + box.h)});`);
    lines.push(`\\node[anchor=north west,inner sep=0pt,text=black!70,font=${fontOf(6)}] at (${mm(box.x + 1.2)},${mm(box.y + 1)}) {${escapeText(box.label, ctx)}};`);
  }

  lines.push('% item numbers');
  for (const l of page.labels) {
    lines.push(`\\node[anchor=east,inner sep=0pt,font=${fontOf(8, '\\bfseries')}] at (${mm(l.x)},${mm(l.y)}) {${l.n}};`);
  }

  lines.push('% bubbles and their letters');
  for (const b of page.bubbles) {
    lines.push(`\\draw[line width=.3pt] (${mm(b.cx)},${mm(b.cy)}) circle[radius=${mm(b.r)}];`);
    lines.push(`\\node[inner sep=0pt,text=black!45,font=${fontOf(5)}] at (${mm(b.cx)},${mm(b.cy)}) {${b.letter}};`);
  }

  lines.push('% ID strip');
  for (const c of page.idCells) {
    if (c.filled) lines.push(`\\fill (${mm(c.x)},${mm(c.y)}) rectangle (${mm(c.x + c.size)},${mm(c.y + c.size)});`);
  }
  lines.push('\\end{tikzpicture}%', '\\par');
  return lines.join('\n');
}

/**
 * The answer key: 5 column pairs ("12. B"), column-major, in blocks of at
 * most `maxRows` rows. An unmatched answer prints "--" with a star.
 */
export function keyTable(items, { cols = 5, maxRows = 40 } = {}) {
  const blocks = [];
  for (let start = 0; start < items.length; start += cols * maxRows) {
    const chunk = items.slice(start, start + cols * maxRows);
    const rows = Math.ceil(chunk.length / cols);
    const spec = Array.from({ length: cols }, (_, c) => `r@{\\hspace{1.5mm}}l${c < cols - 1 ? '@{\\hspace{11mm}}' : ''}`).join('');
    const lines = [`\\begin{tabular}{@{}${spec}@{}}`];
    for (let r = 0; r < rows; r += 1) {
      const cells = [];
      for (let c = 0; c < cols; c += 1) {
        const it = chunk[c * rows + r];
        if (!it) { cells.push(' & '); continue; }
        cells.push(it.answerIndex >= 0
          ? `${it.n}. & \\textbf{${it.answerLetter}}`
          : `${it.n}. & \\textbf{--}\\textsuperscript{*}`);
      }
      lines.push(`${cells.join(' & ')} \\\\`);
    }
    lines.push('\\end{tabular}');
    blocks.push(`{\\renewcommand{\\arraystretch}{1.3}\\noindent${lines.join('\n')}\\par}`);
  }
  return blocks.join('\n\\medskip\n');
}

/**
 * One worked solution: number, subject and topic, the answer letter and its
 * option, then the explanation (already LaTeX) or a note that none is stored.
 */
export function solutionBlock(item, { subjectLabel, optionLatex, explanationLatex, answerLatex }) {
  const topic = [subjectLabel, item.subtopic].filter(Boolean).map((s) => escapeText(s)).join(' -- ');
  const answer = item.answerIndex >= 0 ? `\\textbf{${item.answerLetter}}` : '\\textbf{--}';
  const lines = [
    `\\par\\medskip\\noindent\\textbf{${item.n}.}~\\textsc{${topic}}\\hfill Answer: ${answer}\\par\\nopagebreak`,
  ];
  if (item.answerIndex >= 0) lines.push(`\\noindent\\textit{(${item.answerLetter})}~${optionLatex}\\par`);
  else lines.push(`\\noindent\\emph{The stored answer matches none of the options:} ${answerLatex}\\par`);
  lines.push(explanationLatex && explanationLatex.trim()
    ? explanationLatex
    : '\\emph{No worked solution is stored for this item yet.}');
  return lines.join('\n');
}
