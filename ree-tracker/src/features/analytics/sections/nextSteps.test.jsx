// Each analysis offers one next step, and only when its finding supports one.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { lowestSubject, overConfident, slowestTopic } from './nextSteps';

const deep = {};
vi.mock('../useDeepAnalytics', () => ({ useDeepAnalytics: (type) => ({ data: deep[type] ?? null, status: 'loaded', retry: vi.fn() }) }));
vi.mock('../CalibrationCurve', () => ({ CalibrationCurve: () => null }));

const { default: SubjectAccuracy } = await import('./SubjectAccuracy');
const { default: TimePerTopic } = await import('./TimePerTopic');
const { default: Calibration } = await import('./Calibration');

// Practice, standing in: shows the preset it was started with.
function Landed() {
  const { preset } = useLocation().state || {};
  return <p>started {preset?.source} {preset?.subject} {preset?.drillTopic} {preset?.drillMode}</p>;
}
const show = (ui) => render(
  <MemoryRouter>
    <Routes>
      <Route path="/" element={ui} />
      <Route path="/practice" element={<Landed />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => { for (const k of Object.keys(deep)) delete deep[k]; });

describe('the rules', () => {
  it('the lowest subject needs two subjects to compare', () => {
    expect(lowestSubject([{ subject: 'EE', accuracy: 58, total: 40 }, { subject: 'ESAS', accuracy: 44, total: 9 }, { subject: 'Mathematics', accuracy: 0, total: 0 }]))
      .toMatchObject({ subject: 'ESAS' });
    expect(lowestSubject([{ subject: 'EE', accuracy: 58, total: 40 }])).toBeNull();
    expect(lowestSubject(null)).toBeNull();
  });

  it('the slowest topic needs five timed answers behind its average', () => {
    expect(slowestTopic([{ subtopic: 'Once', avgTimeMs: 400000, count: 1 }, { subtopic: 'Machines', avgTimeMs: 95000, count: 12 }, { subtopic: 'Algebra', avgTimeMs: 30000, count: 30 }]))
      .toMatchObject({ subtopic: 'Machines' });
    expect(slowestTopic([{ subtopic: 'Once', avgTimeMs: 400000, count: 4 }])).toBeNull();
    expect(slowestTopic(undefined)).toBeNull();
  });

  it('over-confident is high confidence well under what "sure" stands for', () => {
    expect(overConfident([{ confidence: 'HIGH', accuracy: 40 }])).toBe(true);
    expect(overConfident([{ confidence: 'HIGH', accuracy: 95 }, { confidence: 'LOW', accuracy: 5 }])).toBe(false);
    expect(overConfident([])).toBe(false);
  });
});

describe('the links', () => {
  it('Accuracy by subject starts a set on the lowest subject', async () => {
    deep['subject-radar'] = { items: [{ subject: 'EE', accuracy: 58, total: 40 }, { subject: 'Mathematics', accuracy: 44, total: 30 }] };
    show(<SubjectAccuracy />);
    await userEvent.click(screen.getByRole('link', { name: 'Practise Math, your lowest' }));
    expect(screen.getByText(/started adaptive Mathematics/)).toBeInTheDocument();
  });

  it('Time per question starts a drill on the slowest topic', async () => {
    deep['time-analysis'] = { items: [{ subtopic: 'Machines', avgTimeMs: 95000, count: 12 }, { subtopic: 'Algebra', avgTimeMs: 30000, count: 30 }] };
    show(<TimePerTopic />);
    await userEvent.click(screen.getByRole('link', { name: 'Drill Machines, your slowest' }));
    expect(screen.getByText(/started smart-drill All Machines/)).toBeInTheDocument();
  });

  it('Calibration offers the blind-spot drill only when over-confident', async () => {
    deep['confidence-calibration'] = { items: [{ confidence: 'HIGH', accuracy: 95, correct: 19, total: 20 }] };
    const calm = show(<Calibration />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    calm.unmount();

    deep['confidence-calibration'] = { items: [{ confidence: 'HIGH', accuracy: 40, correct: 8, total: 20 }] };
    show(<Calibration />);
    await userEvent.click(screen.getByRole('link', { name: 'Drill what you were sure of and missed' }));
    expect(screen.getByText(/started smart-drill All\s+blind-spot/)).toBeInTheDocument();
  });

  it('with nothing to act on, no link', () => {
    deep['subject-radar'] = { items: [{ subject: 'EE', accuracy: 58, total: 40 }] };
    deep['time-analysis'] = { items: [] };
    show(<><SubjectAccuracy /><TimePerTopic /></>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
