// Mastery view: shared bands, effective (decayed) mastery, and a visible
// "fading" marker when time away has dropped a topic a band. BKT has no
// forgetting term, so a topic mastered in month one used to stay "Mastered"
// however long it went untouched.
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../store/useStore', () => ({
  useStore: (selector) => selector({ dynamicTOS: { Mathematics: ['Calculus', 'Algebra'] } }),
}));

const { default: HeatmapChart } = await import('./HeatmapChart');

const topic = (over) => ({ subject: 'Mathematics', attempts: 20, correct: 15, totalTime: 0, timedAttempts: 0, masteryN: 10, ...over });

describe('HeatmapChart — mastery', () => {
  it('bands on the effective value and marks a topic that has faded a band', () => {
    render(<HeatmapChart stats={{ microTopics: {
      Calculus: topic({ mastery: 0.9, masteryEffective: 0.6, daysSincePractice: 40 }),
    } }} />);
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('Developing · fading (40d)')).toBeInTheDocument();
  });

  it('a recently practised topic shows its stored band with no marker', () => {
    render(<HeatmapChart stats={{ microTopics: {
      Algebra: topic({ mastery: 0.88, masteryEffective: 0.88, daysSincePractice: 0 }),
    } }} />);
    expect(screen.getByText('Mastered')).toBeInTheDocument();
    expect(screen.queryByText(/fading/)).not.toBeInTheDocument();
  });
});

describe('HeatmapChart — drill from a tile', () => {
  it('a tile starts a targeted drill on its topic and subject', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const onDrillTopic = vi.fn();
    render(<HeatmapChart onDrillTopic={onDrillTopic} stats={{ microTopics: {
      Calculus: topic({ mastery: 0.5, masteryEffective: 0.5, daysSincePractice: 2 }),
    } }} />);
    fireEvent.click(screen.getByRole('button', { name: /Drill Calculus/ }));
    expect(onDrillTopic).toHaveBeenCalledWith('Calculus', 'Mathematics');
  });
});
