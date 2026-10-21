import { describe, it, expect } from 'vitest';
import {
  createWarnings, ensureAscii, escapeText, isForbiddenMacro, mathSegment, sanitizeMath, shimLines, splitMath,
} from './latexEscape';

const math = (src, ctx = createWarnings()) => sanitizeMath(src, ctx);

describe('escapeText', () => {
  it('escapes every special character, once', () => {
    expect(escapeText('\\ { } $ % & # _ ^ ~ < > | [ ] ` "')).toBe(
      '\\textbackslash{} \\{ \\} \\$ \\% \\& \\# \\_ \\textasciicircum{} \\textasciitilde{} '
      + '\\textless{} \\textgreater{} \\textbar{} {[} {]} \\textasciigrave{} \\textquotedbl{}',
    );
    // A backslash is not followed by an escaped brace pair (no double escaping).
    expect(escapeText('\\')).toBe('\\textbackslash{}');
    expect(escapeText('{}')).toBe('\\{\\}');
  });

  it('breaks the ligatures that would change the text', () => {
    expect(escapeText('a--b---c')).toBe('a-{}-b-{}-{}-c');
    expect(escapeText('1,,2')).toBe('1,{},2');
  });

  it('keeps plain text as it is', () => {
    expect(escapeText('In a 3-phase system, what is the line voltage?')).toBe('In a 3-phase system, what is the line voltage?');
  });

  it('lets a long URL break after its slashes', () => {
    expect(escapeText('https://example.com/a/very/long/path')).toContain('/\\allowbreak{}');
    expect(escapeText('km/h')).toBe('km/h');
  });
});

describe('Unicode in text and math', () => {
  it('maps symbols through \\ensuremath in text, so a letter after one stays apart', () => {
    expect(escapeText('5\u03A9m')).toBe('5\\ensuremath{\\Omega}m');
    expect(math('5\u03A9m').latex).toBe('5\\Omega m');
  });

  it('reads the micro sign and the Greek mu the same', () => {
    expect(escapeText('10 \u00B5F')).toBe('10 \\ensuremath{\\mu}F');
    expect(escapeText('10 \u03BCF')).toBe('10 \\ensuremath{\\mu}F');
    expect(math('\u00B5_0').latex).toBe('\\mu _0');
  });

  it('prints degrees, collapsing a degree after ^', () => {
    expect(escapeText('25\u00B0C')).toBe('25\\textdegree{}C');
    expect(escapeText('x^\u00B0')).toBe('x\\textdegree{}');
    expect(math('90^\u00B0').latex).toBe('90^{\\circ}');
    expect(math('90^{\u00B0}').latex).toBe('90^{\\circ}');
    expect(math('90\u00B0').latex).toBe('90^{\\circ}');
  });

  it('joins runs of superscripts and subscripts', () => {
    expect(escapeText('10\u207B\u00B3 M')).toBe('10\\ensuremath{^{-3}} M');
    expect(escapeText('H\u2082O')).toBe('H\\ensuremath{_{2}}O');
    expect(math('x\u00B2').latex).toBe('x^{2}');
  });

  it('writes accented letters with accent macros', () => {
    expect(escapeText('Para\u00F1aque')).toBe('Para\\~{n}aque');
    expect(escapeText('na\u00EFve caf\u00E9')).toBe('na\\"{\\i}ve caf\\\'{e}');
    expect(math('\u00F1').latex).toBe('\\text{\\~{n}}');
  });

  it('maps punctuation, the peso and spaces', () => {
    expect(escapeText('a\u2013b\u2014c')).toBe('a--b---c');
    expect(escapeText('\u201Cq\u201D \u2018s\u2019 \u2026')).toBe("``q'' `s' \\ldots{}");
    expect(escapeText('\u20B1 5')).toBe('\\peso{} 5');
    expect(escapeText('a\u00A0b\u2009c\u200Bd')).toBe('a~b\\,cd');
    expect(escapeText('3 \u00D7 4 \u2264 \u221E')).toBe('3 \\ensuremath{\\times} 4 \\ensuremath{\\leq} \\ensuremath{\\infty}');
    expect(escapeText('\u00BD')).toBe('\\ensuremath{\\tfrac{1}{2}}');
  });

  it('prints an unknown glyph as ? and counts it', () => {
    const ctx = createWarnings();
    expect(escapeText('snow \u2603 and \u{1F600}', ctx)).toBe('snow ? and ?');
    expect(ctx.unknownGlyphs).toBe(2);
    expect([...ctx.glyphs]).toEqual(['U+2603', 'U+1F600']);
  });
});

describe('splitMath', () => {
  it('splits text, inline and display math', () => {
    expect(splitMath('a $x$ b $$y$$ c')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'inline', value: 'x' },
      { type: 'text', value: ' b ' },
      { type: 'display', value: 'y' },
      { type: 'text', value: ' c' },
    ]);
  });

  it('honours \\$ as a dollar in text and in math', () => {
    expect(splitMath('\\$5 and $x$')).toEqual([{ type: 'text', value: '\\$5 and ' }, { type: 'inline', value: 'x' }]);
    expect(splitMath('$a\\$b$')).toEqual([{ type: 'inline', value: 'a\\$b' }]);
  });

  it('leaves an unclosed $ as text', () => {
    expect(splitMath('cost $5')).toEqual([{ type: 'text', value: 'cost $5' }]);
  });
});

describe('sanitizeMath rewrites what pdflatex rejects', () => {
  it('escapes raw % # and a stray &', () => {
    expect(math('50%').latex).toBe('50\\%');
    expect(math('\\#1').latex).toBe('\\#1');
    expect(math('#1').latex).toBe('\\#1');
    expect(math('a & b').latex).toBe('a \\& b');
    expect(math('\\text{50% of #1 & V_rms^2}').latex).toBe('\\text{50\\% of \\#1 \\& V\\_rms\\textasciicircum{}2}');
  });

  it('keeps & inside alignment environments', () => {
    expect(math('\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}').latex).toBe('\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}');
    expect(math('\\begin{cases} x & x>0 \\\\ 0 & x \\le 0 \\end{cases}').ok).toBe(true);
  });

  it('turns display environments into their inner forms', () => {
    expect(math('\\begin{align} a &= b \\\\ c &= d \\end{align}').latex).toBe('\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}');
    expect(math('\\begin{align*} a &= b \\end{align*}').latex).toBe('\\begin{aligned} a &= b \\end{aligned}');
    expect(math('\\begin{gather} a \\\\ b \\end{gather}').latex).toBe('\\begin{gathered} a \\\\ b \\end{gathered}');
    expect(math('\\begin{equation} F = ma \\end{equation}').latex).toBe('F = ma');
    expect(math('\\begin{alignat}{2} a &= b \\end{alignat}').latex).toBe('\\begin{alignedat}{2} a &= b \\end{alignedat}');
    expect(math('\\begin{split} x &= 1 \\\\ &= 2 \\end{split}').latex).toBe('\\begin{aligned} x &= 1 \\\\ &= 2 \\end{aligned}');
  });

  it('wraps a top-level line break in gathered', () => {
    expect(math('a = b \\\\ c = d').latex).toBe('\\begin{gathered}a = b \\\\ c = d\\end{gathered}');
  });

  it('strips \\tag and \\label', () => {
    expect(math('x = 1 \\tag{1}').latex).toBe('x = 1');
    expect(math('y = 2 \\label{eq:y}').latex).toBe('y = 2');
  });

  it('rewrites \\textdegree, colours and a prime before a superscript', () => {
    expect(math('90\\textdegree').latex).toBe('90^{\\circ}');
    expect(math('\\color{red}{x}').latex).toBe('\\textcolor{red}{x}');
    expect(math('\\color{#ff0000}{x}').latex).toBe('{x}');
    expect(math('\\textcolor{blue}{y}').latex).toBe('\\textcolor{blue}{y}');
    expect(math("f'^2").latex).toBe('f^{\\prime 2}');
    expect(math("f''^{n}").latex).toBe('f^{\\prime \\prime n}');
  });

  // x^² compiled to x^^{2}: pdflatex read it as ^^ notation and stopped,
  // and one such item took the whole paper with it.
  it('a superscript character written after ^ or _ joins it, never doubles it', () => {
    expect(math('x^\u00B2').latex).toBe('x^{2}');
    expect(math('x^ \u00B3').latex).toBe('x^{3}');
    expect(math('V_\u2082').latex).toBe('V_{2}');
    expect(math('25^\u2103').latex).toBe('25^{\\circ}\\mathrm{C}');
    expect(math('90^\\textdegree').latex).toBe('90^{\\circ}');
    expect(math('x_\u00B2').latex).toBe('x_{^{2}}');
    expect(math("x^'").latex).toBe("x^{'}");
    for (const src of ['x^\u00B2', 'V_\u2082', '25^\u2103', 'a_i^\u00B2']) {
      expect(math(src).latex, src).not.toMatch(/(?<!\\)[\^_]\s*[\^_']/);
    }
  });

  it('what still has a script straight after a script prints as text', () => {
    expect(math('x__2')).toMatchObject({ ok: false });
    expect(math('x^_2')).toMatchObject({ ok: false });
  });
});

describe('sanitizeMath demotes what it cannot make safe', () => {
  it.each([
    ['unbalanced braces', '\\frac{1}{2'],
    ['a closing brace too many', 'a}{b'],
    ['\\input', '\\input{/etc/passwd}'],
    ['\\include', '\\include{x}'],
    ['\\write', '\\write18{rm -rf /}'],
    ['\\immediate', '\\immediate\\write18{ls}'],
    ['\\openout', '\\openout1=x.tex'],
    ['\\read', '\\read16 to \\x'],
    ['\\def', '\\def\\x{1}\\x'],
    ['\\catcode', '\\catcode`\\@=11'],
    ['\\csname', '\\csname input\\endcsname'],
    ['\\usepackage', '\\usepackage{hyperref}'],
    ['\\expandafter', '\\expandafter\\x'],
    ['\\newcommand', '\\newcommand{\\x}{1}'],
    ['a pdfTeX primitive', '\\pdffiledump offset 0 length 99 {/etc/passwd}'],
    ['a conditional', '\\iftrue x \\fi'],
    ['^^ notation', 'a^^5cinput'],
    ['an environment outside the list', '\\begin{tabular}{c} x \\end{tabular}'],
    ['mismatched environments', '\\begin{matrix} a \\end{pmatrix}'],
    ['an unclosed \\left', '\\left( \\frac{a}{b}'],
    ['a text accent in math', "\\'{e}"],
  ])('%s', (_, src) => {
    expect(math(src).ok).toBe(false);
  });

  it('prints a demoted formula as escaped text and counts it', () => {
    const ctx = createWarnings();
    expect(mathSegment({ type: 'inline', value: '\\input{x}' }, ctx)).toBe('\\textbackslash{}input\\{x\\}');
    expect(ctx.demoted).toBe(1);
  });

  it('names the forbidden macros, including the shapes it guards by pattern', () => {
    ['input', 'write', 'def', 'catcode', 'usepackage', 'csname', 'openout', 'immediate', 'read', 'pdfprimitive', 'ifx', 'luaescapestring']
      .forEach((name) => expect(isForbiddenMacro(name), name).toBe(true));
    ['frac', 'sqrt', 'alpha', 'text', 'mathrm', 'Omega'].forEach((name) => expect(isForbiddenMacro(name), name).toBe(false));
  });
});

describe('mathSegment', () => {
  it('places inline, block display and option display math', () => {
    expect(mathSegment({ type: 'inline', value: 'x^2' })).toBe('$x^2$');
    expect(mathSegment({ type: 'display', value: 'x^2' })).toBe('\\fitdisplay{x^2}');
    expect(mathSegment({ type: 'display', value: 'x^2' }, undefined, { mode: 'inline' })).toBe('$\\displaystyle x^2$');
    expect(mathSegment({ type: 'inline', value: '  ' })).toBe('');
  });
});

describe('unknown macros', () => {
  it('collects an unknown macro for a \\providecommand shim, never a known one', () => {
    const ctx = createWarnings();
    expect(math('\\foo{x} + \\frac{a}{b} + \\ohm', ctx).ok).toBe(true);
    expect([...ctx.shims]).toEqual(['foo']);
    expect(shimLines(ctx)).toEqual(['\\providecommand{\\foo}{\\mathrm{foo}}']);
  });
});

describe('ensureAscii', () => {
  it('turns anything outside printable ASCII into ? and counts it', () => {
    const ctx = createWarnings();
    expect(ensureAscii('a\u00E9b\tc\n', ctx)).toBe('a?b\tc\n');
    expect(ctx.nonAscii).toBe(1);
  });
});
