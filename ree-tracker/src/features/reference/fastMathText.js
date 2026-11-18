// src/features/reference/fastMathText.js
//
// Formula cards render thousands of small math strings: a formula, a unit, each
// variable's symbol and meaning. LatexRenderer runs a whole Markdown pipeline
// (remark, rehype, KaTeX) for each one, which made a topic of 60 cards cost
// about a thousand pipelines and lagged phones (2026-11-18). Card text is
// simple: plain words with $…$ math in between. MathText renders that straight
// with KaTeX, keeps each result in a cache shared by every card, and hands
// anything that really is Markdown (lists, tables, bold, $$ blocks) to
// LatexRenderer as before. KaTeX escapes its input and runs with trust off, so
// its HTML is safe to insert.
import katex from 'katex';
import { pesoInMath, PESO_MACRO } from '../../utils/mathDelimiters';

const strict = (code) => (code === 'unknownSymbol' ? 'ignore' : 'warn');
const cache = new Map();
const CACHE_MAX = 6000;

/** KaTeX HTML for one expression, from the cache when it has been drawn before. */
export function katexHtml(tex, display = false) {
  const key = `${display ? 'D' : 'I'}${tex}`;
  let html = cache.get(key);
  if (html === undefined) {
    html = katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      errorColor: 'var(--accent-danger)',
      strict,
      macros: { '\\peso': PESO_MACRO }, // a fresh object: KaTeX may add to it
    });
    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(key, html);
  }
  return html;
}

// Markdown that plain splitting can't reproduce: send it to LatexRenderer.
const NEEDS_MARKDOWN = /\$\$|\\\$|\\\(|\\\[|[*`|#\n[\]]|^\s*[-+>]\s|^\s*\d+\.\s/;

/**
 * Text with $…$ math split into [{ math: boolean, value }] segments, or null
 * when the string needs the full Markdown renderer.
 */
export function mathSegments(content) {
  const s = pesoInMath(String(content));
  if (NEEDS_MARKDOWN.test(s)) return null;
  const out = [];
  let last = 0;
  for (const m of s.matchAll(/\$([^$]+)\$/g)) {
    if (m.index > last) out.push({ math: false, value: s.slice(last, m.index) });
    out.push({ math: true, value: m[1] });
    last = m.index + m[0].length;
  }
  const rest = s.slice(last);
  // A stray $ or a backslash outside math is something Markdown would treat specially.
  if (rest.includes('$') || out.some((p) => !p.math && p.value.includes('\\')) || rest.includes('\\')) return null;
  if (rest) out.push({ math: false, value: rest });
  return out;
}

const SPACING = /^\\(?:quad|[ ,;:])/;
const TEXT_ONLY = /^(\()?\\text\{([^{}]*)\}(\))?([,;.]?)$/;

/**
 * A formula line too wide even when shrunk, cut into pieces that can wrap like
 * words: at top-level `\quad` and after a top-level comma followed by a space
 * (a list "a,\ b,\ c"). A piece that is only a \text{…} note becomes plain text,
 * which wraps; KaTeX can't break inside \text. Returns text with $…$ pieces.
 */
export function wrapPieces(value) {
  const m = typeof value === 'string' ? /^\$([^$]+)\$$/.exec(value.trim()) : null;
  if (!m) return value;
  const body = m[1];
  const pieces = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '\\') {
      if (depth === 0 && body.startsWith('\\quad', i)) {
        pieces.push(body.slice(start, i));
        start = i + 5;
        i += 4;
      } else i += 1;
    } else if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === ',' && depth === 0 && SPACING.test(body.slice(i + 1))) {
      pieces.push(body.slice(start, i + 1));
      const skip = SPACING.exec(body.slice(i + 1))[0].length;
      start = i + 1 + skip;
      i += skip;
    }
  }
  pieces.push(body.slice(start));
  return pieces
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const t = TEXT_ONLY.exec(p);
      return t ? `${t[1] || ''}${t[2].trim()}${t[3] || ''}${t[4]}` : textAsWords(p);
    })
    .join(' ');
}

const EDGE_SPACE = /^(?:\s|\\[ ,;:]|\\q?quad)+|(?:\s|\\[ ,;:]|\\q?quad)+$/g;

// Words inside a piece ("\text{first digit } 0\text{–}6") come out as plain text,
// which wraps; the math between stays math. A \text{} holding braces or
// commands is left as math.
function textAsWords(piece) {
  let out = '';
  let math = '';
  const flush = () => {
    const core = math.replace(EDGE_SPACE, '');
    if (core) out += `${/^\s|^\\[ ,;:q]/.test(math) && out && !out.endsWith(' ') ? ' ' : ''}$${core}$${/\s$|\\[ ,;:]$|quad$/.test(math) ? ' ' : ''}`;
    else if (math && out && !out.endsWith(' ')) out += ' ';
    math = '';
  };
  let i = 0;
  let depth = 0;
  while (i < piece.length) {
    if (depth === 0 && piece.startsWith('\\text{', i)) {
      const close = piece.indexOf('}', i + 6);
      const inner = close === -1 ? null : piece.slice(i + 6, close);
      if (inner !== null && !/[{\\$]/.test(inner)) {
        flush();
        out += inner;
        i = close + 1;
        continue;
      }
    }
    const ch = piece[i];
    if (ch === '\\' && i + 1 < piece.length) { math += ch + piece[i + 1]; i += 2; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    math += ch;
    i += 1;
  }
  flush();
  return out.trim();
}

const LEAD = /^(?:\s|\\q?quad|\\[ ,;:!])+/;
const TRAIL = /(?:\s|\\q?quad|\\[ ,;:!]|[,;])+$/;

/**
 * A long formula split into its lines: a card often packs two or three
 * results into one line ("x = …;\qquad y = …"), which ran off a phone's screen.
 * Splits a single $…$ at top-level `;` and `\qquad`, never inside braces
 * (so \text{…; …} stays whole), and returns each part as its own $…$. Anything
 * else comes back as one line, unchanged.
 */
export function formulaLines(value) {
  if (typeof value !== 'string') return [value];
  const s = value.trim();
  const m = /^\$([^$]+)\$$/.exec(s);
  if (!m || m[1].includes('\\begin')) return [value];
  const body = m[1];
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '\\') {
      if (depth === 0 && body.startsWith('\\qquad', i)) {
        parts.push(body.slice(start, i));
        start = i + 6;
        i += 5;
      } else i += 1; // an escaped character (\; \{ \,) or a command's first letter
    } else if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === ';' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  const lines = parts.map((p) => p.replace(LEAD, '').replace(TRAIL, '')).filter(Boolean);
  return lines.length > 1 ? lines.map((p) => `$${p}$`) : [value];
}

/** Split a list into chunks of `size` (each mounted by LazyMount as it nears the screen). */
export function chunked(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
