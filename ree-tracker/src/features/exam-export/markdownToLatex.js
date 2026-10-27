// src/features/exam-export/markdownToLatex.js
//
// The question bank's Markdown + KaTeX, as LaTeX. A small hand-written parser
// for the subset the bank uses (react-markdown + remark-math render it in the
// app), not a CommonMark implementation.
//
// Math is protected first: every $...$ and $$...$$ becomes a placeholder
// (private-use characters), the Markdown is parsed around the placeholders,
// then each formula comes back through sanitizeMath. So `$a*b*c$` is never
// read as emphasis and `t_p` in a formula is never escaped.
//
// Modes:
//   block  (stems, solutions): paragraphs, headings, lists, quotes, tables,
//          code, rules; a display formula is \fitdisplay (scaled to the column)
//   inline (options): one line; lists and tables are flattened, a display
//          formula is $\displaystyle ...$
import { createWarnings, escapeText, ensureAscii, mathSegment, prepareField, splitMath } from './latexEscape';
import { isTableRow, isTableStart, parseAlign, splitRow } from '../../utils/pipeTable';

// Placeholders: inline math U+E000 n U+E001, display math U+E002 n U+E003.
const INLINE_PH = (i) => `\uE000${i}\uE001`;
const DISPLAY_PH = (i) => `\uE002${i}\uE003`;
const DISPLAY_LINE = /^\s*\uE002(\d+)\uE003\s*$/;

// Words that say the item leans on a picture the bank doesn't store.
export const FIGURE_RE = /\b(?:figure|fig\.|diagram|the circuit shown|shown (?:below|above)|as shown|see (?:the )?(?:figure|diagram)|network shown|graph shown)(?!\w)/i;

/** True when a stem refers to a figure (none are stored, so a box is drawn). */
export function mentionsFigure(text) {
  return typeof text === 'string' && FIGURE_RE.test(text);
}

const MD_PUNCT = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const FENCE = /^\s*(```|~~~)/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^\s{0,3}>\s?/;

const indentOf = (line) => (/^\s*/.exec(line)[0].replace(/\t/g, '    ').length);

function startsBlock(lines, i) {
  const line = lines[i];
  return FENCE.test(line) || HEADING.test(line) || HR.test(line) || QUOTE.test(line)
    || LIST_ITEM.test(line) || DISPLAY_LINE.test(line) || isTableStart(lines, i);
}

function parseList(lines, start) {
  const first = LIST_ITEM.exec(lines[start]);
  const base = indentOf(first[1]);
  const ordered = /\d/.test(first[2]);
  const block = { type: 'list', ordered, start: ordered ? parseInt(first[2], 10) : 1, items: [] };
  let item = null;
  let childLines = [];
  let lastBlank = false;
  const closeItem = () => {
    if (!item) return;
    const minIndent = childLines.filter((l) => l.trim()).reduce((m, l) => Math.min(m, indentOf(l)), Infinity);
    item.children = childLines.length && Number.isFinite(minIndent)
      ? parseLines(childLines.map((l) => l.replace(/\t/g, '    ').slice(Math.min(minIndent, indentOf(l)))))
      : [];
    block.items.push(item);
    item = null;
    childLines = [];
  };
  let i = start;
  for (; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) {
      // A blank line ends the list unless more of it follows.
      let k = i + 1;
      while (k < lines.length && !lines[k].trim()) k += 1;
      if (k >= lines.length) break;
      const next = LIST_ITEM.exec(lines[k]);
      const continues = (next && indentOf(next[1]) >= base && (indentOf(next[1]) > base || /\d/.test(next[2]) === ordered))
        || (!next && indentOf(lines[k]) > base);
      if (!continues) break;
      if (item) childLines.push('');
      lastBlank = true;
      continue;
    }
    const m = LIST_ITEM.exec(line);
    const indent = indentOf(line);
    if (m && indent <= base + 1 && indent >= base) {
      if (/\d/.test(m[2]) !== ordered) break;
      closeItem();
      item = { text: m[3], children: [] };
      lastBlank = false;
      continue;
    }
    if (indent > base + 1) {
      if (item && !lastBlank && !m && childLines.length === 0) item.text += `\n${line.trim()}`;
      else childLines.push(line);
      continue;
    }
    // A line back at the margin: a lazy continuation, or the list is over.
    if (!lastBlank && item && !startsBlock(lines, i)) {
      item.text += `\n${line.trim()}`;
      continue;
    }
    break;
  }
  closeItem();
  return { block, next: i };
}

function parseLines(lines) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }

    const fence = FENCE.exec(line);
    if (fence) {
      const body = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) { body.push(lines[i]); i += 1; }
      i += 1;
      blocks.push({ type: 'code', lines: body });
      continue;
    }
    const display = DISPLAY_LINE.exec(line);
    if (display) { blocks.push({ type: 'display', index: Number(display[1]) }); i += 1; continue; }
    const heading = HEADING.exec(line);
    if (heading) { blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] }); i += 1; continue; }
    if (HR.test(line)) { blocks.push({ type: 'hr' }); i += 1; continue; }
    if (isTableStart(lines, i)) {
      const header = splitRow(line);
      const align = parseAlign(lines[i + 1]);
      const rows = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) { rows.push(splitRow(lines[i])); i += 1; }
      blocks.push({ type: 'table', header, align, rows });
      continue;
    }
    if (QUOTE.test(line)) {
      const inner = [];
      while (i < lines.length && lines[i].trim() && QUOTE.test(lines[i])) { inner.push(lines[i].replace(QUOTE, '')); i += 1; }
      blocks.push({ type: 'quote', blocks: parseLines(inner) });
      continue;
    }
    if (LIST_ITEM.test(line)) {
      const { block, next } = parseList(lines, i);
      blocks.push(block);
      i = next;
      continue;
    }
    const para = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) { para.push(lines[i]); i += 1; }
    blocks.push({ type: 'para', text: para.join('\n') });
  }
  return blocks;
}

/** Markdown text (math already replaced by placeholders) as a block list. */
export function parseBlocks(text) {
  return parseLines(String(text ?? '').replace(/\r\n?/g, '\n').split('\n'));
}

// --- inline ----------------------------------------------------------------------

const isSpaceChar = (c) => c === undefined || /\s/.test(c);
const isWordChar = (c) => c !== undefined && /[A-Za-z0-9]/.test(c);

/** Index of the closing delimiter for emphasis opened at `from`, or -1. */
function findEmphasisClose(src, from, delim) {
  for (let j = from; j < src.length; j += 1) {
    if (src[j] === '\\') { j += 1; continue; }
    if (src[j] === '`') {
      const end = src.indexOf('`', j + 1);
      if (end > 0) { j = end; continue; }
    }
    if (src.startsWith(delim, j) && j > from && !isSpaceChar(src[j - 1])) {
      if (delim.length === 1 && src[j + 1] === delim) { j += 1; continue; }
      if (delim[0] === '_' && isWordChar(src[j + delim.length])) continue;
      return j;
    }
  }
  return -1;
}

function restoreMath(str, env) {
  return str
    .replace(/\uE000(\d+)\uE001/g, (m, n) => mathSegment(env.maths[Number(n)], env.ctx, { mode: 'inline' }))
    .replace(/\uE002(\d+)\uE003/g, (m, n) => mathSegment(env.maths[Number(n)], env.ctx, { mode: env.display }));
}

/**
 * Inline Markdown as LaTeX: emphasis, code spans, links (text only), images
 * (the figure box), <br>/<sup>/<sub>, backslash escapes. Other tags are
 * dropped.
 */
export function inlineToLatex(src, env) {
  const s = String(src ?? '');
  const inner = { ...env, display: 'inline' };
  let out = '';
  let buf = '';
  const flush = () => {
    out += escapeText(buf, env.ctx);
    buf = '';
  };
  for (let i = 0; i < s.length;) {
    const ch = s[i];
    const rest = s.slice(i);
    if (ch === '\\' && i + 1 < s.length && MD_PUNCT.includes(s[i + 1])) {
      buf += s[i + 1];
      i += 2;
      continue;
    }
    if (ch === '\n') {
      // Two spaces before a newline: a hard break. Otherwise a space.
      if (/ {2,}$/.test(buf) && env.display !== 'inline') {
        buf = buf.replace(/ +$/, '');
        flush();
        out += '\\newline{}\n';
      } else {
        buf += '\n';
      }
      i += 1;
      continue;
    }
    if (ch === '`') {
      const m = /^(`+)([\s\S]*?[^`])\1(?!`)/.exec(rest);
      if (m) {
        flush();
        out += `\\texttt{${escapeText(m[2].trim(), env.ctx)}}`;
        i += m[0].length;
        continue;
      }
    }
    if (ch === '!' && s[i + 1] === '[') {
      const m = /^!\[([^\]]*)\]\(([^)\s]*)(?:\s+"[^"]*")?\)/.exec(rest);
      if (m) {
        flush();
        out += env.display === 'block' && env.figures !== 'text' ? '\\examfigure{}' : '[figure]';
        i += m[0].length;
        continue;
      }
    }
    if (ch === '[') {
      const m = /^\[([^\]]*)\]\(([^)\s]*)(?:\s+"[^"]*")?\)/.exec(rest);
      if (m) {
        flush();
        out += inlineToLatex(m[1], inner);
        i += m[0].length;
        continue;
      }
    }
    if (ch === '<') {
      let m = /^<br\s*\/?>/i.exec(rest);
      if (m) {
        flush();
        out += env.display === 'inline' ? ' ' : '\\newline{}';
        i += m[0].length;
        continue;
      }
      m = /^<(sup|sub)>([\s\S]*?)<\/\1>/i.exec(rest);
      if (m) {
        flush();
        out += `\\text${m[1].toLowerCase() === 'sup' ? 'superscript' : 'subscript'}{${inlineToLatex(m[2], inner)}}`;
        i += m[0].length;
        continue;
      }
      m = /^<(https?:\/\/[^>\s]+)>/i.exec(rest);
      if (m) {
        buf += m[1];
        i += m[0].length;
        continue;
      }
      m = /^<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?>/.exec(rest);
      if (m) {
        i += m[0].length;
        continue;
      }
    }
    if ((ch === '*' || ch === '_') && s[i + 1] === ch && !isSpaceChar(s[i + 2])
      && (ch === '*' || !isWordChar(s[i - 1]))) {
      const close = findEmphasisClose(s, i + 2, ch + ch);
      if (close > 0) {
        flush();
        out += `\\textbf{${inlineToLatex(s.slice(i + 2, close), inner)}}`;
        i = close + 2;
        continue;
      }
    }
    if ((ch === '*' || ch === '_') && s[i + 1] !== ch && !isSpaceChar(s[i + 1])
      && (ch === '*' || !isWordChar(s[i - 1]))) {
      const close = findEmphasisClose(s, i + 1, ch);
      if (close > 0) {
        flush();
        out += `\\emph{${inlineToLatex(s.slice(i + 1, close), inner)}}`;
        i = close + 1;
        continue;
      }
    }
    buf += ch;
    i += 1;
  }
  flush();
  return restoreMath(out, env);
}

// --- blocks -----------------------------------------------------------------------

const ALIGN_COLUMN = {
  l: '>{\\raggedright\\arraybackslash}X',
  c: '>{\\centering\\arraybackslash}X',
  r: '>{\\raggedleft\\arraybackslash}X',
};

/** A pipe table as a full-width tabularx, every column wrapping. */
export function tableToLatex(table, env) {
  const cols = Math.max(1, table.header.length);
  const fit = (cells) => Array.from({ length: cols }, (_, k) => cells[k] ?? '');
  const cell = (c) => inlineToLatex(c, { ...env, display: 'inline' });
  const spec = fit(table.align).map((a) => ALIGN_COLUMN[a] || ALIGN_COLUMN.l).join('|');
  const lines = [
    '\\par\\smallskip\\noindent{\\small\\setlength{\\tabcolsep}{3pt}\\renewcommand{\\arraystretch}{1.15}%',
    `\\begin{tabularx}{\\linewidth}{|${spec}|}`,
    '\\hline',
    `${fit(table.header).map((c) => `\\textbf{${cell(c)}}`).join(' & ')} \\\\`,
    '\\hline',
    ...table.rows.map((r) => `${fit(r).map(cell).join(' & ')} \\\\`),
    '\\hline',
    '\\end{tabularx}}\\par\\smallskip',
  ];
  return lines.join('\n');
}

function codeToLatex(lines, env) {
  if (!lines.length) return '';
  const body = lines.map((l) => {
    const lead = /^ */.exec(l)[0].length;
    const text = escapeText(l.slice(lead), env.ctx);
    return `${'\\ '.repeat(lead)}${text}` || '\\mbox{}';
  }).join('\\\\\n');
  return `\\par\\smallskip\\noindent{\\ttfamily\\small ${body}}\\par\\smallskip`;
}

function listToLatex(block, env, depth) {
  if (depth >= 2) {
    // Deeper than two levels: plain indented lines.
    return block.items.map((item, k) => {
      const marker = block.ordered ? `${block.start + k}.` : '\\textbullet{}';
      const children = item.children.length ? `\n\n${blocksToLatex(item.children, env, depth + 1)}` : '';
      return `\\par\\noindent\\hspace*{${depth * 1.2}em}${marker}~${inlineToLatex(item.text, env)}${children}`;
    }).join('\n');
  }
  const opts = 'leftmargin=*,itemsep=1pt,topsep=2pt,parsep=0pt';
  const open = block.ordered
    ? `\\begin{enumerate}[label=\\arabic*.,start=${block.start},${opts}]`
    : `\\begin{itemize}[${opts}]`;
  const items = block.items.map((item) => {
    const children = item.children.length ? `\n${blocksToLatex(item.children, env, depth + 1)}` : '';
    return `\\item ${inlineToLatex(item.text, env)}${children}`;
  });
  return [open, ...items, block.ordered ? '\\end{enumerate}' : '\\end{itemize}'].join('\n');
}

function blockToLatex(block, env, depth) {
  switch (block.type) {
    case 'para': return inlineToLatex(block.text.trim(), env);
    case 'heading': return `\\par\\noindent\\textbf{${inlineToLatex(block.text, { ...env, display: 'inline' })}}\\par`;
    case 'hr': return '\\par\\noindent\\rule{\\linewidth}{0.4pt}\\par';
    case 'code': return codeToLatex(block.lines, env);
    case 'display': return mathSegment(env.maths[block.index], env.ctx, { mode: 'block' });
    case 'table': return tableToLatex(block, env);
    case 'quote': return `\\begin{quote}\n${blocksToLatex(block.blocks, env, depth)}\n\\end{quote}`;
    case 'list': return listToLatex(block, env, depth);
    default: return '';
  }
}

function blocksToLatex(blocks, env, depth = 0) {
  return blocks.map((b) => blockToLatex(b, env, depth)).filter((s) => s && s.trim()).join('\n\n');
}

/** Blocks as one line (options): lists and tables flattened. */
function flattenBlocks(blocks, env) {
  return blocks.map((b) => {
    switch (b.type) {
      case 'para':
      case 'heading': return inlineToLatex(b.text, env);
      case 'code': return b.lines.map((l) => `\\texttt{${escapeText(l.trim(), env.ctx)}}`).join(' ');
      case 'display': return mathSegment(env.maths[b.index], env.ctx, { mode: 'inline' });
      case 'table': return [b.header, ...b.rows].map((r) => r.map((c) => inlineToLatex(c, env)).join(', ')).join('; ');
      case 'quote': return flattenBlocks(b.blocks, env);
      case 'list': return b.items.map((item) => [inlineToLatex(item.text, env), flattenBlocks(item.children, env)]
        .filter(Boolean).join(' ')).join('; ');
      default: return '';
    }
  }).filter(Boolean).join(' ').replace(/\s*\n\s*/g, ' ');
}

/**
 * A Markdown + KaTeX field as LaTeX.
 * @param {string|null|undefined} input
 * @param {{ mode?: 'block'|'stem'|'inline', ctx?: object, figures?: 'box'|'text' }} [opts]
 */
export function markdownToLatex(input, { mode = 'block', ctx = createWarnings(), figures = 'box' } = {}) {
  const { source, protectMath } = prepareField(input, ctx);
  if (!source.trim()) return '';
  // Private-use characters are reserved for the placeholders.
  let text = source.replace(/[\uE000-\uF8FF]/g, () => {
    ctx.unknownGlyphs += 1;
    return '?';
  });
  const maths = [];
  if (protectMath) {
    text = splitMath(text).map((seg) => {
      if (seg.type === 'text') return seg.value;
      maths.push(seg);
      return seg.type === 'display' ? `\n\n${DISPLAY_PH(maths.length - 1)}\n\n` : INLINE_PH(maths.length - 1);
    }).join('');
  }
  const inline = mode === 'inline';
  const env = { ctx, maths, display: inline ? 'inline' : 'block', figures };
  let out;
  if (inline) {
    const lines = text.split('\n').filter((l) => l.trim());
    out = lines.length > 1 ? flattenBlocks(parseBlocks(text), env) : inlineToLatex(text.trim(), env);
    out = out.replace(/\s*\n\s*/g, ' ').trim();
  } else {
    out = blocksToLatex(parseBlocks(text), env);
  }
  return ensureAscii(out, ctx);
}
