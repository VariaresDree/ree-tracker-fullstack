// Tabs: each tab names its panel, Home/End jump, the active tab scrolls into
// view, and the edges fade while there is more to scroll.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useState } from 'react';
import { Tabs, TabPanel } from './Tabs';

const TABS = ['overview', 'topics', 'weak', 'confidence', 'habits', 'syllabus', 'plan'].map((id) => ({ id, label: id }));

function Harness({ initial = 'overview' }) {
  const [tab, setTab] = useState(initial);
  return (
    <>
      <Tabs id="t" label="Sections" tabs={TABS} active={tab} onChange={setTab} />
      <TabPanel id="t" active={tab}>panel {tab}</TabPanel>
    </>
  );
}

const realRO = globalThis.ResizeObserver;
afterEach(() => { globalThis.ResizeObserver = realRO; });

describe('Tabs', () => {
  it('links each tab to the panel, and the panel to the active tab', () => {
    render(<Harness />);
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAccessibleName('overview');
    expect(screen.getByRole('tab', { name: 'topics' })).toHaveAttribute('aria-controls', panel.id);
    fireEvent.click(screen.getByRole('tab', { name: 'topics' }));
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('topics');
  });

  it('Home and End go to the first and last tab', () => {
    render(<Harness initial="weak" />);
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'plan' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('fades the edge that has more to scroll', () => {
    let report;
    globalThis.ResizeObserver = class { constructor(cb) { report = cb; } observe() {} disconnect() {} };
    const { container } = render(<Harness />);
    const strip = screen.getByRole('tablist');
    Object.defineProperties(strip, {
      scrollWidth: { configurable: true, value: 900 },
      clientWidth: { configurable: true, value: 360 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    });
    act(() => report());
    expect(container.querySelector('[data-fade="right"]')).not.toBeNull();
    expect(container.querySelector('[data-fade="left"]')).toBeNull();
    strip.scrollLeft = 540;
    fireEvent.scroll(strip);
    expect(container.querySelector('[data-fade="left"]')).not.toBeNull();
    expect(container.querySelector('[data-fade="right"]')).toBeNull();
  });

  it('scrolls the strip, not the page, to show the active tab', () => {
    const scrollTo = vi.fn();
    render(<Harness />);
    const strip = screen.getByRole('tablist');
    strip.scrollTo = scrollTo;
    Object.defineProperties(strip, { clientWidth: { configurable: true, value: 300 }, scrollLeft: { configurable: true, value: 0 } });
    const last = screen.getByRole('tab', { name: 'plan' });
    Object.defineProperties(last, { offsetLeft: { configurable: true, value: 700 }, offsetWidth: { configurable: true, value: 80 } });
    fireEvent.click(last);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 676 }));
  });
});
