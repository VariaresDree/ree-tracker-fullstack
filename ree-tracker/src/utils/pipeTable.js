// src/utils/pipeTable.js
// The pipe-table rules, shared by the app's renderer (remarkPipeTables) and the
// LaTeX export (markdownToLatex), so a table that prints is a table on screen.
// A table is a header line with `|`, a delimiter line (`|:--|--:|`), then body
// rows until a blank line or a line without `|`. Callers protect math first, so
// a `|` inside `$...$` never splits a cell.

export const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

/** True when lines[i] is a header row and lines[i + 1] its delimiter row. */
export const isTableStart = (lines, i) => lines[i].includes('|') && i + 1 < lines.length
  && lines[i + 1].includes('|') && TABLE_SEP.test(lines[i + 1]);

/** True while a line still belongs to a table's body. */
export const isTableRow = (line) => Boolean(line.trim()) && line.includes('|');

/** Split a table row on unescaped pipes. */
export function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells = [];
  let cell = '';
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === '\\' && s[i + 1] === '|') { cell += '\\|'; i += 1; continue; }
    if (s[i] === '|') { cells.push(cell.trim()); cell = ''; continue; }
    cell += s[i];
  }
  cells.push(cell.trim());
  return cells;
}

/** The delimiter row's cells as 'l' | 'c' | 'r' (no colon is left). */
export const parseAlign = (delimiterLine) => splitRow(delimiterLine).map((c) => {
  const left = c.startsWith(':');
  const right = c.endsWith(':');
  if (left && right) return 'c';
  if (right) return 'r';
  return 'l';
});
