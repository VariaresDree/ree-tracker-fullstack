import { describe, it, expect } from 'vitest';
import { GENERAL_AVERAGE, SUBJECT_FLOOR } from '@ree/shared';
import { scoreTone } from './scoreTone';

describe('scoreTone', () => {
  it('turns at the board’s two marks, not at numbers of its own', () => {
    expect(scoreTone(GENERAL_AVERAGE)).toBe('success');
    expect(scoreTone(GENERAL_AVERAGE - 1)).toBe('amber');
    expect(scoreTone(SUBJECT_FLOOR)).toBe('amber');
    expect(scoreTone(SUBJECT_FLOOR - 1)).toBe('danger');
    expect([100, 70, 69, 50, 49, 0].map(scoreTone)).toEqual(['success', 'success', 'amber', 'amber', 'danger', 'danger']);
  });
});
