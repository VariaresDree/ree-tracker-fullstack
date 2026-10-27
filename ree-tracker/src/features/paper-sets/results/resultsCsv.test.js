// The results CSVs: RFC 4180 quoting, and no cell a spreadsheet would run as
// a formula (a name typed as "=HYPERLINK(...)" is shown as text).
import { describe, it, expect } from 'vitest';
import { itemAnalysis } from './itemAnalysis';
import { csvCell, csvFileName, manilaDateTime, toCsv, toItemAnalysisCsv, toResultsCsv } from './resultsCsv';

const item = (n, subject, answerIndex, text = `Q${n}`) => ({ n, subject, text, options: ['a', 'b', 'c', 'd'], answer: 'a', answerIndex, explanation: null });
const SET = {
  id: 'K7P29QXAM3TD',
  label: 'SET B',
  profile: 'prc_blended',
  sections: [
    { subject: 'Mathematics', from: 1, to: 1 },
    { subject: 'ESAS', from: 2, to: 2 },
    { subject: 'EE', from: 3, to: 3 },
  ],
  items: [item(1, 'Mathematics', 0, '=SUM(A1) is a "trap", isn\u2019t it?'), item(2, 'ESAS', 1), item(3, 'EE', 2)],
  edits: {},
};

const lines = (csv) => csv.split('\r\n').slice(0, -1);

describe('csvCell', () => {
  it('quotes commas, quotes and line breaks, doubling the quotes', () => {
    expect(csvCell('Dela Cruz, Juan')).toBe('"Dela Cruz, Juan"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell(null)).toBe('');
    expect(csvCell(33.3)).toBe('33.3');
    expect(csvCell(-5)).toBe('-5'); // a number is a number
  });

  it('defuses a cell a spreadsheet would run as a formula', () => {
    expect(csvCell('=HYPERLINK("http://x","y")')).toBe('"\'=HYPERLINK(""http://x"",""y"")"');
    expect(csvCell('+63 912')).toBe("'+63 912");
    expect(csvCell('-2+3')).toBe("'-2+3");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('\tcmd')).toBe("'\tcmd");
    expect(csvCell('Juan = 1')).toBe('Juan = 1'); // only at the start
  });

  it('ends every row with CRLF', () => {
    expect(toCsv([['a', 'b'], [1, 2]])).toBe('a,b\r\n1,2\r\n');
  });
});

describe('toResultsCsv', () => {
  it('one row per sheet: score, each Part, the verdict, Manila time and every answer', () => {
    const sheets = [
      { id: 's1', takerName: 'Dela Cruz, Juan', isSelf: false, answers: 'AB*', scannedAt: '2026-10-27T06:05:00.000Z' },
      { id: 's2', takerName: '=cmd|calc', isSelf: false, answers: '-BC', scannedAt: '2026-10-27T17:30:00.000Z' },
      { id: 's3', takerName: null, isSelf: true, answers: 'ABC', scannedAt: '2026-10-27T01:00:00.000Z' },
    ];
    const [head, juan, evil, self] = lines(toResultsCsv(SET, sheets));
    expect(head).toBe('Name,Score,Scored,Percent,Mathematics correct,Mathematics total,ESAS correct,ESAS total,EE correct,EE total,General average,Verdict,Scanned at (Manila),1,2,3');
    // Math 100, ESAS 100, EE 0 -> (25 + 30) = 55 weighted: FAILED.
    expect(juan).toBe('"Dela Cruz, Juan",2,3,66.7,1,1,1,1,0,1,55,FAILED,2026-10-27 14:05,A,B,*');
    expect(evil).toBe("'=cmd|calc,2,3,66.7,0,1,1,1,1,1,75,CONDITIONAL PASS,2026-10-28 01:30,,B,C");
    expect(self.startsWith('Self-check,3,3,100,')).toBe(true);
  });

  it('Manila time is UTC+8', () => {
    expect(manilaDateTime('2026-10-27T16:00:00Z')).toBe('2026-10-28 00:00');
    expect(manilaDateTime('not a date')).toBe('');
  });
});

describe('toItemAnalysisCsv', () => {
  it('one row per item, with the question text defused and quoted', () => {
    const sheets = [
      { answers: 'AB*', isSelf: false },
      { answers: 'BBC', isSelf: false },
    ];
    const [head, one, two, three] = lines(toItemAnalysisCsv(SET, itemAnalysis(SET, sheets)));
    expect(head).toBe('Item,Subject,Key,Percent correct,A,B,C,D,Blank,Two marks,Most-chosen wrong,Discrimination,Question');
    expect(one).toBe('1,Mathematics,A,50,1,1,0,0,0,0,B,,"\'=SUM(A1) is a ""trap"", isn\u2019t it?"');
    expect(two).toBe('2,ESAS,B,100,0,2,0,0,0,0,,,Q2');
    expect(three).toBe('3,EE,C,50,0,0,1,0,0,1,,,Q3');
  });

  it('names the files by set and code', () => {
    expect(csvFileName(SET, 'results')).toBe('SETB-K7P2-9QXA-M3TD-results.csv');
  });
});
