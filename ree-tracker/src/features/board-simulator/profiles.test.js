import { describe, it, expect } from 'vitest';
import { setupConfig, configForProfile, sittingKindLabel } from './profiles';

describe('setup config', () => {
  it('drops what a finished run leaves behind', () => {
    const leftover = { mode: 'subject', subject: 'EE', battleId: 'ABC123', fullBoard: { sessionId: 'b' }, source: 'retake', retakeQuestions: [{}], retake: {} };
    expect(setupConfig(leftover)).toEqual({ mode: 'subject', subject: 'EE', source: 'library' });
  });

  it('a profile picked after a battle or a board starts clean', () => {
    const next = configForProfile('prc_subject', { subject: 'EE', battleId: 'ABC123', fullBoard: { sessionId: 'b', sectionIndex: 2 } });
    expect(next.battleId).toBeUndefined();
    expect(next.fullBoard).toBeUndefined();
    expect(next).toMatchObject({ isPrcStandard: true, count: 100, subject: 'EE' });
  });

  it('names a sitting kind the way the formats are named', () => {
    expect(['blended', 'custom', 'full-board', 'subject', 'battle', 'retake', 'placement', 'nope'].map(sittingKindLabel))
      .toEqual(['Mixed paper', 'Custom mock', 'Full PRC board', 'One subject (PRC clock)', 'Battle', 'Retake', 'Placement test', null]);
  });
});
