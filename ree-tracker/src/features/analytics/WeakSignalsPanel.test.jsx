import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import WeakSignalsPanel from './WeakSignalsPanel';

let lastLocation;
function Probe() { lastLocation = useLocation(); return <div>landed</div>; }

const renderPanel = (data) => render(
  <MemoryRouter>
    <Routes>
      <Route path="/" element={<WeakSignalsPanel data={data} />} />
      <Route path="/review" element={<Probe />} />
      <Route path="/materials" element={<Probe />} />
    </Routes>
  </MemoryRouter>,
);

const DATA = {
  blindSpots: [{ topic: 'Protection', subject: 'EE', topicId: 't-p', confidentMisses: 6, attempts: 12, rate: 0.5 }],
  timeSinks: [{ topic: 'Power Systems', subject: 'EE', topicId: null, attempts: 9, medianSecs: 245 }],
  recentConfidentMisses: [{ questionId: 'q1', subject: 'EE', subtopic: 'Protection', answeredAt: '2026-10-01T00:00:00Z', text: 'Relay coordination…' }],
};

describe('WeakSignalsPanel', () => {
  it('lists blind spots and time sinks with what makes them so', () => {
    renderPanel(DATA);
    expect(screen.getByText(/6 confident misses of 12 answers \(50%\)/)).toBeInTheDocument();
    expect(screen.getByText(/median 4m 05s per item/)).toBeInTheDocument();
    expect(screen.getByText('Relay coordination…')).toBeInTheDocument();
  });

  it('"Fix this" starts a blind-spot drill on that topic', () => {
    renderPanel(DATA);
    fireEvent.click(screen.getByRole('button', { name: 'Fix this' }));
    expect(lastLocation.pathname).toBe('/review');
    expect(lastLocation.state.preset).toMatchObject({ source: 'smart-drill', drillMode: 'blind-spot', drillTopicId: 't-p' });
  });

  it('a time sink opens that topic\u2019s formula cards', () => {
    renderPanel(DATA);
    fireEvent.click(screen.getByRole('button', { name: 'Formula cards' }));
    expect(lastLocation.pathname).toBe('/materials');
    expect(lastLocation.state).toMatchObject({ tab: 'reference', search: 'Power Systems', kind: 'formula' });
  });

  it('explains what it tracks when there is nothing yet', () => {
    renderPanel({ blindSpots: [], timeSinks: [], recentConfidentMisses: [] });
    expect(screen.getByText('No blind spots or time sinks yet')).toBeInTheDocument();
  });
});
