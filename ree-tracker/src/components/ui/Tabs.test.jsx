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
    expect(strip).toHaveAttribute('data-fade', 'right');
    strip.scrollLeft = 270;
    fireEvent.scroll(strip);
    expect(strip).toHaveAttribute('data-fade', 'both');
    strip.scrollLeft = 540;
    fireEvent.scroll(strip);
    expect(strip).toHaveAttribute('data-fade', 'left');
    // Painted bands in the page colour would show as stripes over the texture.
    expect(container.querySelector('span[data-fade]')).toBeNull();
  });

  it('one bar marks the active tab, under its label, and slides to the next by a transform', () => {
    render(<Harness />);
    screen.getAllByRole('tab').forEach((t, i) => {
      Object.defineProperties(t, {
        offsetLeft: { configurable: true, value: i * 100 },
        offsetWidth: { configurable: true, value: 90 },
      });
      // The label sits inside the tab's 16px inset.
      Object.defineProperties(t.querySelector('[data-tab-label]'), {
        offsetLeft: { configurable: true, value: i * 100 + 16 },
        offsetWidth: { configurable: true, value: 58 },
      });
    });
    fireEvent.click(screen.getByRole('tab', { name: 'topics' }));
    const bar = document.querySelector('[data-indicator]');
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(bar.style.transform).toBe('translateX(116px) scaleX(58)');
    // The tabs no longer draw their own underline, so only the bar moves.
    expect(screen.getByRole('tab', { name: 'topics' }).className).not.toMatch(/border-\[var\(--accent\)\]/);
  });

  it('the active label is bold, without changing the tab name or width', () => {
    render(<Harness initial="topics" />);
    const tab = screen.getByRole('tab', { name: 'topics' });
    expect(tab.className).toMatch(/font-semibold/);
    expect(tab.textContent).toBe('topics');
    // Every label reserves its bold width, so the row doesn't shift.
    screen.getAllByRole('tab').forEach((t) => expect(t.querySelector('[data-text]')).toHaveAttribute('data-text', t.textContent));
  });

  it('the strip scrolls sideways only', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist').className).toMatch(/overflow-x-auto/);
    expect(screen.getByRole('tablist').className).toMatch(/overflow-y-hidden/);
  });

  const stripAt = ({ scrollLeft, clientWidth = 300, scrollWidth = 900 }) => {
    const strip = screen.getByRole('tablist');
    strip.scrollTo = vi.fn();
    Object.defineProperties(strip, {
      clientWidth: { configurable: true, value: clientWidth },
      scrollWidth: { configurable: true, value: scrollWidth },
      scrollLeft: { configurable: true, value: scrollLeft },
    });
    return strip;
  };
  const tabAt = (name, offsetLeft, offsetWidth) => {
    const tab = screen.getByRole('tab', { name });
    Object.defineProperties(tab, { offsetLeft: { configurable: true, value: offsetLeft }, offsetWidth: { configurable: true, value: offsetWidth } });
    return tab;
  };

  it('scrolls the strip, not the page, to bring a tab on the right clear of the fade', () => {
    render(<Harness />);
    const strip = stripAt({ scrollLeft: 0 });
    fireEvent.click(tabAt('plan', 700, 80));
    // Its right edge lands 32px (the fade) inside the strip's right edge.
    expect(strip.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 780 - 300 + 32 }));
  });

  it('and a tab under the left fade', () => {
    render(<Harness initial="plan" />);
    const strip = stripAt({ scrollLeft: 450 });
    fireEvent.click(tabAt('confidence', 400, 100));
    expect(strip.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 400 - 32 }));
  });

  it("leaves the strip alone when the tab is already in view", () => {
    render(<Harness />);
    const strip = stripAt({ scrollLeft: 0 });
    fireEvent.click(tabAt('topics', 100, 90));
    expect(strip.scrollTo).not.toHaveBeenCalled();
  });
});
