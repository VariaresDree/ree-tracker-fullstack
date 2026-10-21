// src/features/exam-export/latexEscape.js
//
// Question-bank text and KaTeX math, made safe for pdflatex.
//
// Text goes through escapeText: one pass over the characters with a map, so
// nothing is escaped twice. Unicode becomes LaTeX through a glyph table; a
// glyph with no LaTeX form prints as "?" and is counted in the warnings.
//
// Math goes through sanitizeMath, which rewrites what KaTeX accepts and
// pdflatex rejects (raw % # &, align inside a formula, \tag, \color{c}{x}...)
// and demotes to plain text anything it can't make safe: unbalanced braces or
// environments, an environment outside ALLOWED_MATH_ENVS, and every TeX
// primitive that reads or writes files, defines macros or builds control
// sequences (\input, \write, \def, \catcode, \csname, ^^ notation...).
// Unknown macros are kept and get a \providecommand shim, which can only help a
// formula compile: it never overrides an existing definition.
//
// Every table key is a \u escape so this source stays ASCII (copyGuard bans
// glyph icons in src, and the rule is easier to keep with no glyphs at all).
import { hasUnbalancedMath } from '@ree/shared';
import { normalizeMathDelimiters } from '../../utils/mathDelimiters';

// --- warnings ---------------------------------------------------------------

/** A per-document collector: counts for the dialog, shims for the preamble. */
export function createWarnings() {
  return {
    unknownGlyphs: 0,
    glyphs: new Set(),
    demoted: 0,
    unbalancedFields: 0,
    nonAscii: 0,
    shims: new Set(),
  };
}

const unknownGlyph = (ctx, ch) => {
  if (ctx) {
    ctx.unknownGlyphs += 1;
    ctx.glyphs.add(`U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
  }
  return '?';
};

// --- glyph tables -----------------------------------------------------------

// char -> { text, math }. Symbols go through \ensuremath in text, so "5\u03A9m"
// can't become \Omegam; in math a control word is followed by a space.
const GLYPHS = new Map();
const mathForm = (m) => (/\\[A-Za-z]+$/.test(m) ? `${m} ` : m);
const sym = (ch, m) => GLYPHS.set(ch, { text: `\\ensuremath{${m}}`, math: mathForm(m) });
const textSym = (ch, text, math) => GLYPHS.set(ch, { text, math });

[
  // Greek, lower case (U+03B5 is the open epsilon KaTeX writes as \varepsilon).
  ['\u03B1', '\\alpha'], ['\u03B2', '\\beta'], ['\u03B3', '\\gamma'], ['\u03B4', '\\delta'],
  ['\u03B5', '\\varepsilon'], ['\u03F5', '\\epsilon'], ['\u03B6', '\\zeta'], ['\u03B7', '\\eta'],
  ['\u03B8', '\\theta'], ['\u03D1', '\\vartheta'], ['\u03B9', '\\iota'], ['\u03BA', '\\kappa'],
  ['\u03BB', '\\lambda'], ['\u03BC', '\\mu'], ['\u00B5', '\\mu'], ['\u03BD', '\\nu'], ['\u03BE', '\\xi'],
  ['\u03BF', '{o}'], ['\u03C0', '\\pi'], ['\u03D6', '\\varpi'], ['\u03C1', '\\rho'], ['\u03F1', '\\varrho'],
  ['\u03C2', '\\varsigma'], ['\u03C3', '\\sigma'], ['\u03C4', '\\tau'], ['\u03C5', '\\upsilon'],
  ['\u03C6', '\\varphi'], ['\u03D5', '\\phi'], ['\u03C7', '\\chi'], ['\u03C8', '\\psi'], ['\u03C9', '\\omega'],
  // Greek, upper case. The ones that look Latin print as upright Latin.
  ['\u0391', '\\mathrm{A}'], ['\u0392', '\\mathrm{B}'], ['\u0393', '\\Gamma'], ['\u0394', '\\Delta'],
  ['\u2206', '\\Delta'], ['\u0395', '\\mathrm{E}'], ['\u0396', '\\mathrm{Z}'], ['\u0397', '\\mathrm{H}'],
  ['\u0398', '\\Theta'], ['\u0399', '\\mathrm{I}'], ['\u039A', '\\mathrm{K}'], ['\u039B', '\\Lambda'],
  ['\u039C', '\\mathrm{M}'], ['\u039D', '\\mathrm{N}'], ['\u039E', '\\Xi'], ['\u039F', '\\mathrm{O}'],
  ['\u03A0', '\\Pi'], ['\u03A1', '\\mathrm{P}'], ['\u03A3', '\\Sigma'], ['\u03A4', '\\mathrm{T}'],
  ['\u03A5', '\\Upsilon'], ['\u03A6', '\\Phi'], ['\u03A7', '\\mathrm{X}'], ['\u03A8', '\\Psi'],
  ['\u03A9', '\\Omega'], ['\u2126', '\\Omega'],
  // Operators and relations.
  ['\u00D7', '\\times'], ['\u00B1', '\\pm'], ['\u2213', '\\mp'], ['\u00F7', '\\div'], ['\u00B7', '\\cdot'],
  ['\u22C5', '\\cdot'], ['\u2219', '\\cdot'], ['\u2217', '\\ast'], ['\u2212', '-'], ['\u2264', '\\leq'],
  ['\u2265', '\\geq'], ['\u2266', '\\leqq'], ['\u2267', '\\geqq'], ['\u2260', '\\neq'], ['\u2248', '\\approx'],
  ['\u2261', '\\equiv'], ['\u2245', '\\cong'], ['\u223C', '\\sim'], ['\u2243', '\\simeq'], ['\u221D', '\\propto'],
  ['\u226A', '\\ll'], ['\u226B', '\\gg'], ['\u221E', '\\infty'], ['\u221A', '\\surd'], ['\u2220', '\\angle'],
  ['\u2221', '\\measuredangle'], ['\u222B', '\\int'], ['\u222C', '\\iint'], ['\u222E', '\\oint'],
  ['\u2211', '\\sum'], ['\u220F', '\\prod'], ['\u2202', '\\partial'], ['\u2207', '\\nabla'],
  ['\u2192', '\\rightarrow'], ['\u2190', '\\leftarrow'], ['\u2191', '\\uparrow'], ['\u2193', '\\downarrow'],
  ['\u2194', '\\leftrightarrow'], ['\u21D2', '\\Rightarrow'], ['\u21D0', '\\Leftarrow'], ['\u21D4', '\\Leftrightarrow'],
  ['\u27F6', '\\longrightarrow'], ['\u21CC', '\\rightleftharpoons'], ['\u2208', '\\in'], ['\u2209', '\\notin'],
  ['\u2282', '\\subset'], ['\u2286', '\\subseteq'], ['\u222A', '\\cup'], ['\u2229', '\\cap'],
  ['\u2205', '\\emptyset'], ['\u2200', '\\forall'], ['\u2203', '\\exists'], ['\u00AC', '\\neg'],
  ['\u2227', '\\wedge'], ['\u2228', '\\vee'], ['\u22A5', '\\perp'], ['\u2225', '\\parallel'], ['\u2016', '\\|'],
  ['\u2234', '\\therefore'], ['\u2235', '\\because'], ['\u2295', '\\oplus'], ['\u2297', '\\otimes'],
  ['\u2299', '\\odot'], ['\u2218', '\\circ'], ['\u210F', '\\hbar'], ['\u2113', '\\ell'], ['\u2032', "'"],
  ['\u2033', "''"], ['\u2713', '\\checkmark'], ['\u2714', '\\checkmark'], ['\u2717', '\\times'],
  ['\u2715', '\\times'], ['\u25B3', '\\triangle'], ['\u2206', '\\Delta'],
  // Fractions.
  ['\u00BD', '\\tfrac{1}{2}'], ['\u00BC', '\\tfrac{1}{4}'], ['\u00BE', '\\tfrac{3}{4}'],
  ['\u2153', '\\tfrac{1}{3}'], ['\u2154', '\\tfrac{2}{3}'], ['\u215B', '\\tfrac{1}{8}'],
].forEach(([ch, m]) => sym(ch, m));

// Bullet: a text bullet in text, \bullet in math.
textSym('\u2022', '\\textbullet{}', '\\bullet ');
// Degree: \textdegree in text, a superscript circle in math.
textSym('\u00B0', '\\textdegree{}', '^{\\circ}');
textSym('\u2103', '\\textdegree{}C', '^{\\circ}\\mathrm{C}');
// Angstrom (the sign decomposes; the letter is handled by the accent rule).
textSym('\u212B', '\\AA{}', '\\text{\\AA}');
// Punctuation.
textSym('\u2013', '--', '-');
textSym('\u2014', '---', '-');
textSym('\u2012', '--', '-');
textSym('\u2010', '-', '-');
textSym('\u2011', '-', '-');
textSym('\u2018', '`', "'");
textSym('\u2019', "'", "'");
textSym('\u201A', ',', ',');
textSym('\u201C', '``', "''");
textSym('\u201D', "''", "''");
textSym('\u201E', ',,', ',');
textSym('\u2026', '\\ldots{}', '\\ldots ');
textSym('\u2044', '/', '/');
textSym('\u2215', '/', '/');
textSym('\u00AB', '\\guillemotleft{}', '\\ll ');
textSym('\u00BB', '\\guillemotright{}', '\\gg ');
textSym('\u00A1', '\\textexclamdown{}', '!');
textSym('\u00BF', '\\textquestiondown{}', '?');
textSym('\u00A7', '\\S{}', '\\S ');
textSym('\u00B6', '\\P{}', '\\P ');
textSym('\u00A9', '\\textcopyright{}', '\\text{\\textcopyright}');
textSym('\u00AE', '\\textregistered{}', '\\text{\\textregistered}');
textSym('\u2122', '\\texttrademark{}', '\\text{\\texttrademark}');
textSym('\u2020', '\\dag{}', '\\dagger ');
textSym('\u2021', '\\ddag{}', '\\ddagger ');
textSym('\u2030', '\\textperthousand{}', '\\text{\\textperthousand}');
// Currency. The peso is a preamble macro with a PHP fallback.
textSym('\u20B1', '\\peso{}', '\\text{\\peso}');
textSym('\u00A3', '\\pounds{}', '\\text{\\pounds}');
textSym('\u20AC', 'EUR', '\\text{EUR}');
textSym('\u00A5', 'JPY', '\\text{JPY}');
textSym('\u00A2', 'c', '\\text{c}');
// Letters with no NFD decomposition.
[
  ['\u00DF', '\\ss{}'], ['\u00E6', '\\ae{}'], ['\u00C6', '\\AE{}'], ['\u00F8', '\\o{}'], ['\u00D8', '\\O{}'],
  ['\u0153', '\\oe{}'], ['\u0152', '\\OE{}'], ['\u0142', '\\l{}'], ['\u0141', '\\L{}'], ['\u0131', '\\i{}'],
  ['\u0111', '\\dj{}'], ['\u0110', '\\DJ{}'], ['\u00F0', '\\dh{}'], ['\u00D0', '\\DH{}'],
  ['\u00FE', '\\th{}'], ['\u00DE', '\\TH{}'],
].forEach(([ch, t]) => textSym(ch, t, `\\text{${t}}`));
// Spacing: NBSP ties, thin spaces stay thin, other wide spaces are spaces.
textSym('\u00A0', '~', '~');
textSym('\u2009', '\\,', '\\,');
textSym('\u202F', '\\,', '\\,');
['\u2002', '\u2003', '\u2007', '\u2008', '\u200A', '\u205F', '\u3000'].forEach((ch) => textSym(ch, ' ', ' '));
// Invisible: dropped.
['\u200B', '\u200C', '\u200D', '\u2060', '\uFEFF', '\u00AD'].forEach((ch) => textSym(ch, '', ''));

const SUPERSCRIPTS = {
  '\u2070': '0', '\u00B9': '1', '\u00B2': '2', '\u00B3': '3', '\u2074': '4', '\u2075': '5', '\u2076': '6',
  '\u2077': '7', '\u2078': '8', '\u2079': '9', '\u207A': '+', '\u207B': '-', '\u207C': '=', '\u207D': '(',
  '\u207E': ')', '\u207F': 'n', '\u2071': 'i',
};
const SUBSCRIPTS = {
  '\u2080': '0', '\u2081': '1', '\u2082': '2', '\u2083': '3', '\u2084': '4', '\u2085': '5', '\u2086': '6',
  '\u2087': '7', '\u2088': '8', '\u2089': '9', '\u208A': '+', '\u208B': '-', '\u208C': '=', '\u208D': '(',
  '\u208E': ')', '\u2090': 'a', '\u2091': 'e', '\u2092': 'o', '\u2093': 'x', '\u2095': 'h', '\u2096': 'k',
  '\u2097': 'l', '\u2098': 'm', '\u2099': 'n', '\u209A': 'p', '\u209B': 's', '\u209C': 't',
};

// Combining marks (NFD) -> accent macros: "\u00F1" is n + U+0303 -> \~{n}.
const ACCENTS = {
  '\u0300': '\\`', '\u0301': "\\'", '\u0302': '\\^', '\u0303': '\\~', '\u0304': '\\=', '\u0306': '\\u',
  '\u0307': '\\.', '\u0308': '\\"', '\u030A': '\\r', '\u030B': '\\H', '\u030C': '\\v',
  '\u0323': '\\d', '\u0327': '\\c', '\u0328': '\\k', '\u0331': '\\b',
};
const BELOW = new Set(['\u0323', '\u0327', '\u0328', '\u0331']);

function accentLatex(ch, inMath) {
  const d = ch.normalize('NFD');
  if (d === ch || d.length < 2) return null;
  const base = d[0];
  if (!/[A-Za-z]/.test(base)) return null;
  const marks = [...d.slice(1)];
  if (!marks.every((m) => ACCENTS[m])) return null;
  // A dotless i or j under an accent above, as typeset text does.
  let out = (base === 'i' || base === 'j') && !marks.some((m) => BELOW.has(m)) ? `\\${base}` : base;
  for (const m of marks) out = `${ACCENTS[m]}{${out}}`;
  return inMath ? `\\text{${out}}` : out;
}

/** One non-ASCII character as LaTeX, or "?" with a warning. */
function glyph(ch, inMath, ctx) {
  const g = GLYPHS.get(ch);
  if (g) return inMath ? g.math : g.text;
  const accented = accentLatex(ch, inMath);
  if (accented != null) return accented;
  return unknownGlyph(ctx, ch);
}

// --- text ---------------------------------------------------------------------

const TEXT_ASCII = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  $: '\\$',
  '%': '\\%',
  '&': '\\&',
  '#': '\\#',
  _: '\\_',
  '^': '\\textasciicircum{}',
  '~': '\\textasciitilde{}',
  '<': '\\textless{}',
  '>': '\\textgreater{}',
  '|': '\\textbar{}',
  '[': '{[}',
  ']': '{]}',
  '`': '\\textasciigrave{}',
  '"': '\\textquotedbl{}',
};

// Placeholders markdownToLatex puts where math was (private use, U+E000-E003).
const isPlaceholder = (code) => code >= 0xE000 && code <= 0xE003;

/**
 * Plain text as LaTeX text, in one pass. Ligatures that would change the text
 * ("--" en dash, ",," low quote) are broken with {}. Placeholder characters
 * (U+E000-E003) pass through for the caller to restore.
 */
export function escapeText(input, ctx) {
  // A superscript degree is just a degree.
  const chars = Array.from(String(input ?? '').replace(/\^\{?\u00B0\}?/g, '\u00B0'));
  let out = '';
  let run = 0; // characters since the last space
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    const code = ch.codePointAt(0);
    run = /\s/.test(ch) ? 0 : run + 1;
    // A long unbroken token (a URL, a path) may break after / or _.
    if (run > 15 && (ch === '/' || ch === '_')) {
      out += `${ch === '/' ? '/' : '\\_'}\\allowbreak{}`;
      continue;
    }
    if (code < 0x80) {
      if (ch === '-') { out += chars[i + 1] === '-' ? '-{}' : '-'; continue; }
      if (ch === ',') { out += chars[i + 1] === ',' ? ',{}' : ','; continue; }
      const mapped = TEXT_ASCII[ch];
      if (mapped !== undefined) { out += mapped; continue; }
      if (ch === '\t') { out += ' '; continue; }
      if (ch === '\n') { out += '\n'; continue; }
      if (code < 0x20 || code === 0x7F) continue;
      out += ch;
      continue;
    }
    if (isPlaceholder(code)) { out += ch; continue; }
    if (SUPERSCRIPTS[ch] || SUBSCRIPTS[ch]) {
      const table = SUPERSCRIPTS[ch] ? SUPERSCRIPTS : SUBSCRIPTS;
      let run = '';
      while (i < chars.length && table[chars[i]]) { run += table[chars[i]]; i += 1; }
      i -= 1;
      out += `\\ensuremath{${table === SUPERSCRIPTS ? '^' : '_'}{${run}}}`;
      continue;
    }
    out += glyph(ch, false, ctx);
  }
  return out;
}

/** Anything left outside [\t\n\x20-\x7E] becomes "?" (counted). The last guard. */
export function ensureAscii(input, ctx) {
  return String(input ?? '').replace(/[^\t\n\x20-\x7E]/gu, () => {
    if (ctx) ctx.nonAscii += 1;
    return '?';
  });
}

// --- splitting math from text --------------------------------------------------

/**
 * Split a field into text, inline ($...$) and display ($$...$$) segments.
 * A backslash escapes the next character (so \$ is a dollar in text); an
 * opener with no closer leaves the rest as text.
 * @returns {{ type: 'text'|'inline'|'display', value: string }[]}
 */
export function splitMath(input) {
  const s = String(input ?? '');
  const segs = [];
  let text = '';
  const pushText = () => {
    if (text) segs.push({ type: 'text', value: text });
    text = '';
  };
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '\\' && i + 1 < s.length) {
      text += ch + s[i + 1];
      i += 2;
      continue;
    }
    if (ch === '$') {
      const display = s[i + 1] === '$';
      const open = display ? 2 : 1;
      const close = findMathClose(s, i + open, display);
      if (close < 0) {
        text += s.slice(i);
        break;
      }
      pushText();
      segs.push({ type: display ? 'display' : 'inline', value: s.slice(i + open, close) });
      i = close + open;
      continue;
    }
    text += ch;
    i += 1;
  }
  pushText();
  return segs;
}

function findMathClose(s, from, display) {
  for (let j = from; j < s.length; j += 1) {
    const c = s[j];
    if (c === '\\') { j += 1; continue; }
    if (c !== '$') continue;
    if (!display) return j;
    if (s[j + 1] === '$') return j;
  }
  return -1;
}

// --- math -------------------------------------------------------------------------

/** Environments a formula may use (after the rewrites below). */
export const ALLOWED_MATH_ENVS = new Set([
  'matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix', 'smallmatrix', 'cases',
  'aligned', 'alignedat', 'gathered', 'split', 'array', 'subarray',
]);

// KaTeX display environments, rewritten to their inner forms: the formula is
// set as $\displaystyle ...$ inside a box, where only the inner forms work.
// null = strip the environment and keep its body.
const ENV_REWRITES = {
  align: 'aligned', 'align*': 'aligned', flalign: 'aligned', 'flalign*': 'aligned',
  eqnarray: 'aligned', 'eqnarray*': 'aligned', split: 'aligned',
  gather: 'gathered', 'gather*': 'gathered', multline: 'gathered', 'multline*': 'gathered',
  alignat: 'alignedat', 'alignat*': 'alignedat',
  equation: null, 'equation*': null, displaymath: null, math: null,
};

// Environments where & separates columns; elsewhere a raw & is \&.
const AMP_ENVS = new Set([
  'matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix', 'smallmatrix', 'cases',
  'aligned', 'alignedat', 'array',
]);

/** Macros that read or write files, define macros or build control sequences. */
export const FORBIDDEN_MACROS = new Set([
  'input', 'include', 'includeonly', 'endinput', 'write', 'immediate', 'openin', 'openout', 'closein',
  'closeout', 'read', 'readline', 'newread', 'newwrite', 'def', 'gdef', 'edef', 'xdef', 'let', 'futurelet',
  'catcode', 'lccode', 'uccode', 'sfcode', 'mathcode', 'delcode', 'csname', 'endcsname', 'ifcsname',
  'expandafter', 'noexpand', 'expanded', 'unexpanded', 'scantokens', 'detokenize', 'string', 'meaning',
  'newcommand', 'renewcommand', 'providecommand', 'newenvironment', 'renewenvironment',
  'DeclareMathOperator', 'DeclareRobustCommand', 'NewDocumentCommand', 'RenewDocumentCommand',
  'ProvideDocumentCommand', 'DeclareDocumentCommand', 'usepackage', 'RequirePackage', 'documentclass',
  'special', 'directlua', 'latelua', 'luaexec', 'makeatletter', 'makeatother', 'verb', 'href', 'url',
  'includegraphics', 'jobname', 'uppercase', 'lowercase', 'global', 'long', 'outer', 'protected',
  'afterassignment', 'aftergroup', 'everypar', 'everymath', 'everydisplay', 'everyeof', 'everyhbox',
  'everyvbox', 'everycr', 'everyjob', 'output', 'shipout', 'dump', 'batchmode', 'nonstopmode',
  'scrollmode', 'errorstopmode', 'errmessage', 'message', 'typeout', 'wlog', 'show', 'showthe',
  'showbox', 'showlists', 'showtokens', 'romannumeral', 'number', 'the', 'chardef', 'mathchardef',
  'countdef', 'dimendef', 'skipdef', 'toksdef', 'count', 'dimen', 'skip', 'toks', 'advance', 'multiply',
  'divide', 'setcounter', 'addtocounter', 'stepcounter', 'setlength', 'addtolength', 'newcounter',
  'newlength', 'font', 'loop', 'repeat', 'halign', 'valign', 'noalign', 'span', 'omit',
  'IfFileExists', 'InputIfFileExists', 'lstinputlisting', 'verbatiminput', 'primitive', 'ExplSyntaxOn',
  'ExplSyntaxOff', 'fi', 'else', 'or', 'begingroup', 'endgroup', 'csstring', 'par', 'section',
  'subsection', 'subsubsection', 'chapter', 'paragraph', 'item', 'newpage', 'clearpage', 'cleardoublepage',
  'pagebreak', 'footnote', 'caption', 'maketitle', 'tableofcontents', 'bibliography',
]);

// Name shapes no formula needs: pdfTeX and LuaTeX primitives (\pdffiledump
// reads files), conditionals, anything about files or the shell.
const FORBIDDEN_NAME = /^(pdf|lua|if|open|close|write|read|input|include|every|new|renew|provide|Declare|Require)|code$|def$|File|[Ss]hell/;

/** True for a macro that demotes the formula to text. */
export const isForbiddenMacro = (name) => FORBIDDEN_MACROS.has(name) || FORBIDDEN_NAME.test(name);

// What pdflatex already knows with the preamble's packages (amsmath, amssymb,
// bm, cancel/shims): these never get a shim.
export const KNOWN_MATH_MACROS = new Set(`
alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa varkappa lambda mu nu xi
omicron pi varpi rho varrho sigma varsigma tau upsilon phi varphi chi psi omega Gamma Delta Theta Lambda
Xi Pi Sigma Upsilon Phi Psi Omega varGamma varDelta varTheta varLambda varXi varPi varSigma varUpsilon
varPhi varPsi varOmega digamma
frac dfrac tfrac cfrac sqrt binom dbinom tbinom genfrac over atop choose above
sin cos tan cot sec csc sinh cosh tanh coth arcsin arccos arctan sech csch arcsec arccsc arccot
log ln lg exp lim liminf limsup sup inf max min det dim ker hom arg deg gcd Pr mod bmod pmod pod
operatorname mathop mathbin mathrel mathord mathopen mathclose mathpunct mathinner limits nolimits
displaylimits
times div pm mp cdot ast star circ bullet oplus ominus otimes oslash odot cap cup sqcap sqcup vee wedge
setminus wr diamond bigtriangleup bigtriangledown triangleleft triangleright lhd rhd unlhd unrhd
amalg dagger ddagger ltimes rtimes leftthreetimes rightthreetimes intercal dotplus centerdot boxplus
boxminus boxtimes boxdot
leq le geq ge neq ne equiv approx approxeq cong sim simeq propto ll gg lll ggg subset supset subseteq
supseteq subsetneq supsetneq in ni notin owns mid nmid parallel nparallel perp models vdash dashv
doteq prec succ preceq succeq asymp bowtie smile frown leqq geqq leqslant geqslant lesssim gtrsim
nless ngtr nleq ngeq lneq gneq ncong nsim triangleq coloneqq eqcirc circeq
leftarrow rightarrow to gets leftrightarrow Leftarrow Rightarrow Leftrightarrow longleftarrow
longrightarrow longleftrightarrow Longleftarrow Longrightarrow Longleftrightarrow mapsto longmapsto
uparrow downarrow updownarrow Uparrow Downarrow Updownarrow nearrow searrow swarrow nwarrow
hookleftarrow hookrightarrow leftharpoonup rightharpoonup leftharpoondown rightharpoondown
rightleftharpoons leftrightharpoons iff implies impliedby xrightarrow xleftarrow circlearrowleft
circlearrowright curvearrowleft curvearrowright leadsto
infty partial nabla forall exists nexists neg lnot emptyset varnothing angle measuredangle
sphericalangle triangle square blacksquare Box Diamond surd top bot prime backprime hbar hslash ell
wp Re Im aleph beth gimel imath jmath therefore because checkmark complement flat natural sharp
clubsuit diamondsuit heartsuit spadesuit degree
sum prod coprod int iint iiint oint bigcup bigcap bigvee bigwedge bigoplus bigotimes bigodot biguplus
bigsqcup
left right middle big Big bigg Bigg bigl bigr Bigl Bigr biggl biggr Biggl Biggr bigm Bigm biggm Biggm
langle rangle lfloor rfloor lceil rceil lvert rvert lVert rVert vert Vert backslash lbrace rbrace
lbrack rbrack ulcorner urcorner llcorner lrcorner
hat widehat check tilde widetilde acute grave dot ddot dddot breve bar vec mathring overline
underline overbrace underbrace overrightarrow overleftarrow overleftrightarrow underrightarrow
underleftarrow overset underset stackrel substack sideset boxed
mathrm mathbf mathit mathsf mathtt mathcal mathbb mathfrak mathscr mathnormal boldsymbol bm pmb
text textrm textbf textit textsf texttt textnormal textup textsl textmd emph mbox hbox fbox
displaystyle textstyle scriptstyle scriptscriptstyle
quad qquad enspace thinspace medspace thickspace negthinspace negmedspace negthickspace hspace
hfill hskip mskip kern mkern phantom vphantom hphantom smash raisebox raise lower
ldots cdots vdots ddots dots dotsb dotsc dotsi dotsm dotso colon
begin end hline cline vline tag notag nonumber label color textcolor colorbox fcolorbox
cancel bcancel xcancel cancelto not relax nobreak allowbreak cr crcr newline
mathstrut strut ensuremath lt gt R N Z phase ohm micro celsius rarr larr Rarr lrarr
AA aa O o i j l L ss ae AE oe OE S P dag ddag pounds textdegree peso
`.trim().split(/\s+/));

// Structural commands that are fine in text but have no place in a formula:
// dropped (with their argument, for those that take one).
const DROP_WITH_ARG = new Set(['tag', 'label', 'vspace', 'hypertarget']);
const DROP_BARE = new Set(['notag', 'nonumber', 'noindent', 'centering', 'tiny', 'scriptsize', 'footnotesize',
  'small', 'normalsize', 'large', 'Large', 'LARGE', 'huge', 'Huge', 'displaybreak', 'allowdisplaybreaks']);

// Accent control symbols: text only (pdflatex wants \mathaccent in math).
const ACCENT_SYMBOLS = new Set(["'", '`', '"', '^', '~', '=', '.']);

// Text-mode commands: inside their braces _ ^ & are text characters.
const TEXT_GROUP = new Set(['text', 'textrm', 'textbf', 'textit', 'textsf', 'texttt', 'textnormal', 'textup',
  'textsl', 'textmd', 'emph', 'mbox', 'hbox', 'fbox']);

// xcolor's base names: any other name would be "undefined color".
const XCOLOR_NAMES = new Set(['red', 'green', 'blue', 'cyan', 'magenta', 'yellow', 'black', 'gray', 'grey',
  'white', 'darkgray', 'lightgray', 'brown', 'lime', 'olive', 'orange', 'pink', 'purple', 'teal', 'violet']);

/** Tokens: a control word, a control symbol, or one character. */
function tokenizeMath(src) {
  const toks = [];
  const chars = Array.from(src);
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (ch === '\\') {
      let j = i + 1;
      while (j < chars.length && /[A-Za-z]/.test(chars[j])) j += 1;
      if (j > i + 1) {
        toks.push({ t: 'cs', v: chars.slice(i + 1, j).join('') });
        i = j - 1;
      } else if (i + 1 < chars.length) {
        toks.push({ t: 'sym', v: chars[i + 1] });
        i += 1;
      } else {
        toks.push({ t: 'bad', v: '\\' });
      }
      continue;
    }
    toks.push({ t: 'char', v: ch });
  }
  return toks;
}

const isSpace = (tok) => tok && tok.t === 'char' && /\s/.test(tok.v);

/** The braced group at toks[i] ("{" ... "}") as raw text; null if not a group. */
function readGroup(toks, i) {
  let k = i;
  while (isSpace(toks[k])) k += 1;
  if (!toks[k] || toks[k].t !== 'char' || toks[k].v !== '{') return null;
  let depth = 0;
  let raw = '';
  for (let j = k; j < toks.length; j += 1) {
    const tok = toks[j];
    if (tok.t === 'char' && tok.v === '{') depth += 1;
    if (tok.t === 'char' && tok.v === '}') depth -= 1;
    if (depth === 0) return { raw: raw.slice(1), end: j };
    raw += tok.t === 'cs' ? `\\${tok.v}` : tok.t === 'sym' ? `\\${tok.v}` : tok.v;
  }
  return null;
}

const demote = (reason) => ({ ok: false, reason });

/**
 * A KaTeX formula (no delimiters) as pdflatex math, or { ok: false } when it
 * has to print as text instead.
 * @returns {{ ok: true, latex: string } | { ok: false, reason: string }}
 */
export function sanitizeMath(input, ctx, { display = false } = {}) {
  let src = String(input ?? '');
  if (/\^\^/.test(src)) return demote('^^ notation');
  // A degree after ^ is the degree itself; a prime before ^ joins the
  // superscript (pdflatex reads f'^2 as a double superscript, KaTeX doesn't).
  src = src
    .replace(/\^\s*\{\s*\u00B0\s*\}/g, '^{\\circ}')
    .replace(/\^\s*\u00B0/g, '^{\\circ}')
    .replace(/('+)\s*\^\s*(\{[^{}]*\}|\\[A-Za-z]+|[^\s{}\\])/g, (m, primes, sup) => {
      const inner = sup.startsWith('{') ? sup.slice(1, -1) : sup;
      return `^{${'\\prime '.repeat(primes.length)}${inner}}`;
    });

  const toks = tokenizeMath(src);
  const out = [];
  const envs = []; // { name, as } as written and as emitted (null = stripped)
  const textLevels = []; // brace depths that are text mode
  let depth = 0;
  let lefts = 0;
  let needsGather = false;
  const inText = () => textLevels.length > 0;
  // A piece that brings its own ^ or _ (a Unicode superscript or subscript,
  // a degree sign, ℃, a prime) straight after a written ^ or _: x^² is
  // x^{2}, not x^^{2}, which pdflatex reads as ^^ notation or a double
  // superscript and stops, taking the whole paper with it.
  const attach = (piece) => {
    let p = out.length - 1;
    while (p >= 0 && !out[p].trim()) p -= 1;
    const prev = p >= 0 ? out[p] : '';
    if (prev !== '^' && prev !== '_') return piece;
    out.length = p + 1;
    if (piece[0] === prev) {
      const rest = piece.slice(1).trimStart();
      return rest.startsWith('{') ? rest : `{${rest}}`;
    }
    return `{${piece}}`;
  };
  const innerEnv = () => {
    for (let k = envs.length - 1; k >= 0; k -= 1) if (envs[k].as) return envs[k].as;
    return null;
  };

  for (let i = 0; i < toks.length; i += 1) {
    const tok = toks[i];
    if (tok.t === 'bad') return demote('a trailing backslash');
    if (tok.t === 'cs') {
      const name = tok.v;
      if (isForbiddenMacro(name)) return demote(`\\${name}`);
      if (name === 'begin' || name === 'end') {
        const g = readGroup(toks, i + 1);
        if (!g) return demote(`\\${name} without an environment`);
        const env = g.raw.trim();
        i = g.end;
        if (name === 'begin') {
          let as = env;
          if (Object.prototype.hasOwnProperty.call(ENV_REWRITES, env)) as = ENV_REWRITES[env];
          else if (!ALLOWED_MATH_ENVS.has(env)) return demote(`environment ${env}`);
          envs.push({ name: env, as });
          if (as) out.push(`\\begin{${as}}`);
        } else {
          const top = envs.pop();
          if (!top || top.name !== env) return demote('unbalanced environments');
          if (top.as) out.push(`\\end{${top.as}}`);
        }
        continue;
      }
      if (DROP_WITH_ARG.has(name)) {
        let k = i + 1;
        if (toks[k] && toks[k].t === 'char' && toks[k].v === '*') k += 1;
        const g = readGroup(toks, k);
        if (g) i = g.end;
        continue;
      }
      if (DROP_BARE.has(name)) continue;
      if (name === 'textdegree') { out.push(attach('^{\\circ}')); continue; }
      if (name === 'cr' || name === 'crcr' || name === 'newline') {
        if (!innerEnv() && depth === 0) needsGather = true;
        out.push('\\\\');
        continue;
      }
      if (name === 'ce' || name === 'pu') { out.push('\\mathrm'); continue; }
      if (name === 'color' || name === 'textcolor') {
        const g = readGroup(toks, i + 1);
        if (!g) return demote(`\\${name} without a colour`);
        i = g.end;
        const colour = g.raw.trim();
        const next = toks.slice(i + 1).find((t) => !isSpace(t));
        const hasArg = next && next.t === 'char' && next.v === '{';
        if (XCOLOR_NAMES.has(colour)) out.push(hasArg ? `\\textcolor{${colour}}` : `\\color{${colour}}`);
        continue;
      }
      if (name === 'colorbox' || name === 'fcolorbox') {
        // Colour boxes print as plain text: drop the colour arguments.
        for (let n = name === 'fcolorbox' ? 2 : 1; n > 0; n -= 1) {
          const g = readGroup(toks, i + 1);
          if (!g) return demote(`\\${name} without a colour`);
          i = g.end;
        }
        out.push('\\text');
        const next = readGroup(toks, i + 1);
        if (next) textLevels.push(depth + 1);
        continue;
      }
      if (name === 'left') lefts += 1;
      if (name === 'right') lefts -= 1;
      if (TEXT_GROUP.has(name)) {
        const next = toks.slice(i + 1).find((t) => !isSpace(t));
        if (next && next.t === 'char' && next.v === '{') textLevels.push(depth + 1);
      }
      if (!KNOWN_MATH_MACROS.has(name) && ctx) ctx.shims.add(name);
      // The tokenizer ends a control word at the first non-letter, so the
      // next token can't join its name.
      out.push(`\\${name}`);
      continue;
    }
    if (tok.t === 'sym') {
      const v = tok.v;
      if (v === '\\') {
        if (!innerEnv() && depth === 0) needsGather = true;
        out.push('\\\\');
        continue;
      }
      if (v.codePointAt(0) > 0x7E) {
        out.push(inText() ? glyph(v, false, ctx) : attach(glyph(v, true, ctx)));
        continue;
      }
      // Text accents are errors in math; \( and \[ open math inside math.
      if (!inText() && ACCENT_SYMBOLS.has(v)) return demote(`a text accent \\${v} in math`);
      if ('()[]'.includes(v)) return demote(`\\${v} inside a formula`);
      out.push(`\\${v}`);
      continue;
    }
    // A character.
    const v = tok.v;
    if (v === '{') { depth += 1; out.push(v); continue; }
    if (v === '}') {
      depth -= 1;
      if (depth < 0) return demote('unbalanced braces');
      while (textLevels.length && textLevels[textLevels.length - 1] > depth) textLevels.pop();
      out.push(v);
      continue;
    }
    if (v === '%') { out.push('\\%'); continue; }
    if (v === '#') { out.push('\\#'); continue; }
    if (v === '$') { out.push('\\$'); continue; }
    if (v === '&') {
      out.push(!inText() && AMP_ENVS.has(innerEnv()) ? '&' : '\\&');
      continue;
    }
    if (inText() && (v === '_' || v === '^')) {
      out.push(v === '_' ? '\\_' : '\\textasciicircum{}');
      continue;
    }
    if (v === '\t' || v === '\r' || v === '\n') { out.push(' '); continue; }
    const code = v.codePointAt(0);
    if (code < 0x20 || code === 0x7F) continue;
    if (code > 0x7E) {
      if (SUPERSCRIPTS[v] || SUBSCRIPTS[v]) {
        const table = SUPERSCRIPTS[v] ? SUPERSCRIPTS : SUBSCRIPTS;
        let run = '';
        let k = i;
        while (k < toks.length && toks[k].t === 'char' && table[toks[k].v]) { run += table[toks[k].v]; k += 1; }
        i = k - 1;
        out.push(inText()
          ? `\\ensuremath{${table === SUPERSCRIPTS ? '^' : '_'}{${run}}}`
          : attach(`${table === SUPERSCRIPTS ? '^' : '_'}{${run}}`));
        continue;
      }
      if (isPlaceholder(code)) return demote('a placeholder character');
      out.push(inText() ? glyph(v, false, ctx) : attach(glyph(v, true, ctx)));
      continue;
    }
    out.push(v === "'" && !inText() ? attach(v) : v);
  }

  if (depth !== 0) return demote('unbalanced braces');
  if (envs.length) return demote('unbalanced environments');
  if (lefts !== 0) return demote('unbalanced \\left and \\right');
  let latex = out.join('').trim();
  // The guard on what goes out, not only what came in: a script straight
  // after a script (^^, _^, ^') stops pdflatex, so the formula prints as text.
  if (/(?<!\\)[\^_]\s*[\^_']/.test(latex)) return demote('a double superscript or subscript');
  if (needsGather) latex = `\\begin{gathered}${latex}\\end{gathered}`;
  // The source was ASCII-checked character by character; this is the guard.
  latex = ensureAscii(latex, ctx);
  return { ok: true, latex, display };
}

/**
 * One math segment as LaTeX: inline $...$, a display formula scaled to the
 * column (\fitdisplay), or $\displaystyle ...$ inside an option. A formula
 * that can't be made safe prints as its source text.
 * @param {{ type: 'inline'|'display', value: string }} seg
 * @param {'block'|'inline'} mode  block: stems and solutions; inline: options
 */
export function mathSegment(seg, ctx, { mode = 'block' } = {}) {
  const display = seg.type === 'display';
  const res = sanitizeMath(seg.value, ctx, { display });
  if (!res.ok) {
    if (ctx) ctx.demoted += 1;
    return escapeText(seg.value.trim(), ctx);
  }
  if (!res.latex) return '';
  if (!display) return `$${res.latex}$`;
  return mode === 'block' ? `\\fitdisplay{${res.latex}}` : `$\\displaystyle ${res.latex}$`;
}

/**
 * The shared front end for a field: math delimiters normalised, and a field
 * that leaves inline math open treated as text throughout (counted).
 * @returns {{ source: string, protectMath: boolean }}
 */
export function prepareField(input, ctx) {
  if (input == null) return { source: '', protectMath: false };
  const source = normalizeMathDelimiters(String(input));
  if (hasUnbalancedMath(source)) {
    if (ctx) ctx.unbalancedFields += 1;
    return { source, protectMath: false };
  }
  return { source, protectMath: true };
}

/** \providecommand lines for the unknown macros a document used. */
export function shimLines(ctx) {
  return [...(ctx?.shims || [])]
    .filter((name) => /^[A-Za-z]+$/.test(name) && !isForbiddenMacro(name) && !KNOWN_MATH_MACROS.has(name))
    .sort()
    .map((name) => `\\providecommand{\\${name}}{\\mathrm{${name}}}`);
}
