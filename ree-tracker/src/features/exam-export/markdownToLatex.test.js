import { describe, it, expect } from 'vitest';
import { markdownToLatex, mentionsFigure, parseBlocks } from './markdownToLatex';
import { createWarnings } from './latexEscape';
import { FIXTURE_QUESTIONS } from './__fixtures__/fixtureDraws';
import { bracesBalanced, countOf, envsBalanced, isAscii } from './__fixtures__/texAssert';

const md = (s, mode = 'block', ctx = createWarnings()) => markdownToLatex(s, { mode, ctx });

describe('inline Markdown', () => {
  it('puts bold and italic around math', () => {
    expect(md('**$x$** and *$y$*')).toBe('\\textbf{$x$} and \\emph{$y$}');
    expect(md('__strong__ and _em_ here')).toBe('\\textbf{strong} and \\emph{em} here');
  });

  it('reads _ as emphasis only at word boundaries, so t_p survives', () => {
    expect(md('t_p and snake_case_name')).toBe('t\\_p and snake\\_case\\_name');
  });

  it('never reads emphasis inside math', () => {
    expect(md('$a*b*c$ and $t_p$')).toBe('$a*b*c$ and $t_p$');
  });

  it('keeps Markdown backslash escapes as literal characters', () => {
    expect(md('\\*not em\\* and \\$5 and \\_')).toBe('*not em* and \\$5 and \\_');
  });

  it('handles code spans, links, images and simple HTML', () => {
    expect(md('use `a_b{}`')).toBe('use \\texttt{a\\_b\\{\\}}');
    expect(md('[the text](https://x.y) here')).toBe('the text here');
    expect(md('see ![net](n.png)')).toBe('see \\examfigure{}');
    expect(md('see ![net](n.png)', 'inline')).toBe('see [figure]');
    expect(md('a<br>b, V<sup>2</sup>, H<sub>2</sub>O, <b>bold</b>')).toBe('a\\newline{}b, V\\textsuperscript{2}, H\\textsubscript{2}O, bold');
  });
});

describe('blocks', () => {
  it('nests lists up to two levels', () => {
    const out = md('- one\n- two\n  - nested *em*\n  - more\n- three');
    expect(countOf(out, /\\begin\{itemize\}/g)).toBe(2);
    expect(out).toContain('\\item nested \\emph{em}');
    expect(envsBalanced(out)).toBe(true);
  });

  it('keeps an ordered list\'s start', () => {
    const out = md('3. third\n4. fourth');
    expect(out).toContain('\\begin{enumerate}[label=\\arabic*.,start=3,');
    expect(countOf(out, /\\item /g)).toBe(2);
  });

  it('turns a pipe table into a tabularx with its alignments', () => {
    const out = md('| a | b | c |\n|:-|:-:|-:|\n| 1 | $x^2$ | 3 |');
    expect(out).toContain('\\begin{tabularx}{\\linewidth}{|>{\\raggedright\\arraybackslash}X|>{\\centering\\arraybackslash}X|>{\\raggedleft\\arraybackslash}X|}');
    expect(out).toContain('\\textbf{a} & \\textbf{b} & \\textbf{c} \\\\');
    expect(out).toContain('1 & $x^2$ & 3 \\\\');
    expect(countOf(out, /\\hline/g)).toBe(3);
  });

  it('sets display math on its own line, wherever the $$ sat', () => {
    const out = md('Find $$x^2$$ now');
    expect(out).toBe('Find\n\n\\fitdisplay{x^2}\n\nnow');
  });

  it('reads \\( \\) and \\[ \\] as math', () => {
    const out = md('\\(a\\) and \\[b\\]');
    expect(out).toContain('$a$ and');
    expect(out).toContain('\\fitdisplay{b}');
  });

  it('treats a field with a stray $ as text, and counts it', () => {
    const ctx = createWarnings();
    expect(md('costs $5 and $x$ total', 'block', ctx)).toBe('costs \\$5 and \\$x\\$ total');
    expect(ctx.unbalancedFields).toBe(1);
  });

  it('writes headings, quotes, rules and fenced code', () => {
    const out = md('# Title\n\n> quoted\n\n---\n\n```\nrpm = 120*f/P\n  slip\n```');
    expect(out).toContain('\\par\\noindent\\textbf{Title}\\par');
    expect(out).toContain('\\begin{quote}\nquoted\n\\end{quote}');
    expect(out).toContain('\\rule{\\linewidth}{0.4pt}');
    expect(out).toContain('{\\ttfamily\\small rpm = 120*f/P\\\\\n\\ \\ slip}');
  });

  it('returns nothing for an empty field', () => {
    expect(md(null)).toBe('');
    expect(md(undefined)).toBe('');
    expect(md('   ')).toBe('');
  });

  it('parses blocks around placeholders', () => {
    expect(parseBlocks('para one\n\n- a\n- b').map((b) => b.type)).toEqual(['para', 'list']);
  });
});

describe('inline mode (options)', () => {
  it('keeps everything on one line', () => {
    expect(md('line one\nline two', 'inline')).toBe('line one line two');
    expect(md('$$\\frac{V}{R}$$', 'inline')).toBe('$\\displaystyle \\frac{V}{R}$');
    expect(md('- a\n- b', 'inline')).toBe('a; b');
    expect(md('| a | b |\n|---|---|\n| 1 | 2 |', 'inline')).toBe('a, b; 1, 2');
  });

  it('does not read a single-line option as a list', () => {
    expect(md('- 5 V', 'inline')).toBe('- 5 V');
  });
});

describe('mentionsFigure', () => {
  it('spots a stem that leans on a figure', () => {
    ['In the circuit shown below, find I.', 'Refer to Fig. 3.', 'See the diagram.', 'as shown', 'the network shown', 'Use the figure']
      .forEach((s) => expect(mentionsFigure(s), s).toBe(true));
  });

  it('ignores words that only contain one', () => {
    ['Configure the relay.', 'A transfiguration', 'figurehead', 'shown in red'].forEach((s) => expect(mentionsFigure(s), s).toBe(false));
    expect(mentionsFigure(null)).toBe(false);
  });
});

describe('every fixture converts to ASCII with balanced braces and environments', () => {
  const fields = FIXTURE_QUESTIONS.flatMap((q) => [
    ['stem', q.id, q.text, 'block'],
    ['explanation', q.id, q.fixedExplanation, 'block'],
    ...q.options.map((o, i) => [`option ${i}`, q.id, o, 'inline']),
  ]);
  it.each(fields)('%s of %s', (_, __, value, mode) => {
    const out = md(value, mode);
    expect(isAscii(out)).toBe(true);
    expect(bracesBalanced(out)).toBe(true);
    expect(envsBalanced(out)).toBe(true);
    if (mode === 'inline') expect(out).not.toContain('\n');
  });
});
