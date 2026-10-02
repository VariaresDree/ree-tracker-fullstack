// Full PRC board: Mathematics → ESAS → EE, each on its own PRC clock, one
// server session for the three, results withheld until the end.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  FULL_BOARD_SECTIONS, FULL_BOARD_TTL_MS, startFullBoard, loadFullBoard, recordSection,
  clearFullBoard, sectionConfig, fullBoardSummary,
} from './fullBoard';

beforeEach(() => localStorage.clear());

describe('full PRC board state', () => {
  it('runs the three PRC sittings in board order', () => {
    expect(FULL_BOARD_SECTIONS).toEqual(['Mathematics', 'ESAS', 'EE']);
  });

  it('starts at section 0 and persists across a reload', () => {
    const fb = startFullBoard('sess-1', 1000);
    expect(fb).toMatchObject({ sessionId: 'sess-1', sectionIndex: 0, sections: [] });
    expect(loadFullBoard(2000)).toEqual(fb);
  });

  it('a section config is the PRC subject sitting, tagged with the shared session', () => {
    expect(sectionConfig(startFullBoard('sess-1'))).toMatchObject({
      mode: 'subject', subject: 'Mathematics', isPrcStandard: true, count: 100, source: 'library',
      fullBoard: { sessionId: 'sess-1', sectionIndex: 0 },
    });
  });

  it('records a section once and moves on — a re-submit of the same section does not skip ahead', () => {
    let fb = startFullBoard('sess-1');
    fb = recordSection(fb, 0, { subject: 'Mathematics', correct: 62, total: 100, timeTakenSecs: 14000 });
    fb = recordSection(fb, 0, { subject: 'Mathematics', correct: 62, total: 100, timeTakenSecs: 14000 });
    expect(fb.sectionIndex).toBe(1);
    expect(fb.sections).toHaveLength(1);
    expect(loadFullBoard().sectionIndex).toBe(1);
  });

  it('summarises on the PRC rule once all three are done', () => {
    let fb = startFullBoard('sess-1');
    fb = recordSection(fb, 0, { subject: 'Mathematics', correct: 40, total: 100 });
    fb = recordSection(fb, 1, { subject: 'ESAS', correct: 80, total: 100 });
    expect(fullBoardSummary(fb).done).toBe(false);
    fb = recordSection(fb, 2, { subject: 'EE', correct: 80, total: 100 });
    const summary = fullBoardSummary(fb);
    expect(summary).toMatchObject({ done: true, generalAverage: 70, verdict: 'CONDITIONAL PASS' });
    expect(summary.subjectScores).toEqual({ Mathematics: 40, ESAS: 80, EE: 80 });
  });

  it('expires after a week, and can be abandoned', () => {
    startFullBoard('sess-1', 0);
    expect(loadFullBoard(FULL_BOARD_TTL_MS + 1)).toBeNull();
    startFullBoard('sess-2');
    clearFullBoard();
    expect(loadFullBoard()).toBeNull();
  });
});
