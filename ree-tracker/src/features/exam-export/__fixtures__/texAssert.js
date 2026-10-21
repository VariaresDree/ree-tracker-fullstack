// Structural checks on generated LaTeX, shared by the exam-export tests.

/** Only tab, newline and printable ASCII. */
export const isAscii = (s) => /^[\t\n\x20-\x7E]*$/.test(String(s));

/** Braces balance, ignoring escaped ones (\{ \}) and % comments. */
export function bracesBalanced(tex) {
  const s = String(tex);
  let depth = 0;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (c === '\\') { i += 1; continue; }
    if (c === '%') {
      while (i < s.length && s[i] !== '\n') i += 1;
      continue;
    }
    if (c === '{') depth += 1;
    if (c === '}') {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

/** Every \begin{x} has its \end{x}, properly nested. */
export function envsBalanced(tex) {
  const stack = [];
  for (const m of String(tex).matchAll(/\\(begin|end)\{([^}]+)\}/g)) {
    if (m[1] === 'begin') stack.push(m[2]);
    else if (stack.pop() !== m[2]) return false;
  }
  return stack.length === 0;
}

/** How many times `re` (global) matches. */
export const countOf = (s, re) => (String(s).match(re) || []).length;
