// The full-screen focus timer's view: the time as a silent timer, the three
// controls, a live line that speaks only when the mode changes, a ring that
// holds still under reduced motion, the keys (and where they don't apply), the
// confirm before an exam section in progress is ended, and no axe violations.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import FocusView from './FocusView';
import { freshPomodoro, startTimer, modeDurationSecs, remainingSecs, progressOf } from '../../utils/pomodoroLogic';

expect.extend(axeMatchers);

const AXE_OPTS = {
  rules: {
    'color-contrast': { enabled: false }, // no paint in jsdom
    'html-has-lang': { enabled: false },
    'document-title': { enabled: false },
    region: { enabled: false },
  },
};

const T0 = Date.now();
const controls = {
  toggle: vi.fn(), reset: vi.fn(), skip: vi.fn(), setMode: vi.fn(), setExamSection: vi.fn(),
  setExamFullBoard: vi.fn(), update: vi.fn(),
};
const onExit = vi.fn();
const view = (p, now = T0) => (
  <FocusView
    pomodoro={p}
    remaining={remainingSecs(p, now)}
    duration={modeDurationSecs(p)}
    progress={progressOf(p, now)}
    controls={controls}
    onExit={onExit}
  />
);
const key = (k, target = document.body) => fireEvent.keyDown(target, { key: k });

beforeEach(() => {
  Object.values(controls).forEach((f) => f.mockReset());
  onExit.mockReset();
});

describe('FocusView', () => {
  it('shows the time as a timer, under a hidden page heading', () => {
    render(view(freshPomodoro()));
    expect(screen.getByRole('heading', { level: 1, name: 'Focus timer' })).toHaveClass('sr-only');
    const timer = screen.getByRole('timer');
    expect(timer).toHaveTextContent('25:00');
    expect(timer.className).toMatch(/font-mono/);
    expect(timer.className).toMatch(/tabular-nums/);
    expect(screen.getByText('Block 1 of 4 · General')).toBeInTheDocument();
  });

  it('a 6-hour exam section reads h:mm:ss', () => {
    render(view(freshPomodoro({ mode: 'exam', examSection: 'EE' })));
    expect(screen.getByRole('timer')).toHaveTextContent('6:00:00');
    expect(screen.getByText('EE section · 6 hours')).toBeInTheDocument();
  });

  it('the play button says Start, Pause or Resume, and each control calls its action', () => {
    const idle = freshPomodoro();
    const { rerender } = render(view(idle));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(controls.toggle).toHaveBeenCalledTimes(1);

    const running = startTimer(idle, T0);
    rerender(view(running, T0 + 60_000));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    rerender(view({ ...running, isRunning: false, endsAt: null, pausedRemaining: 1200 }));
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Short break' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close the focus timer' }));
    expect(controls.reset).toHaveBeenCalledTimes(1);
    expect(controls.skip).toHaveBeenCalledTimes(1);
    expect(controls.setMode).toHaveBeenCalledWith('short');
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('the live line stays quiet on ticks and speaks on a mode change', () => {
    const running = startTimer(freshPomodoro(), T0);
    const { rerender } = render(view(running, T0));
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent('');
    rerender(view(running, T0 + 1000));
    rerender(view(running, T0 + 2000));
    expect(live).toHaveTextContent('');
    rerender(view(freshPomodoro({ mode: 'short' })));
    expect(live).toHaveTextContent('Short break, 5 minutes');
    rerender(view(freshPomodoro({ mode: 'exam', examSection: 'ESAS' })));
    expect(live).toHaveTextContent('Paper exam, ESAS section, 4 hours');
  });

  it('the ring eases each second but holds still under reduced motion', () => {
    render(view(startTimer(freshPomodoro(), T0), T0 + 5 * 60_000));
    const arc = screen.getByTestId('focus-ring-arc');
    expect(arc.getAttribute('class')).toMatch(/transition-\[stroke-dashoffset\]/);
    expect(arc.getAttribute('class')).toMatch(/motion-reduce:transition-none/);
    const c = Number(arc.getAttribute('stroke-dasharray'));
    expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(c * 0.8);
  });

  it('opens the timer settings', () => {
    render(view(freshPomodoro()));
    fireEvent.click(screen.getByRole('button', { name: 'Timer settings' }));
    expect(screen.getByRole('dialog', { name: 'Timer settings' })).toBeInTheDocument();
  });

  describe('keys', () => {
    it('Space toggles, R resets, S skips, Escape closes', () => {
      render(view(freshPomodoro()));
      key(' ');
      key('r');
      key('S');
      key('Escape');
      expect(controls.toggle).toHaveBeenCalledTimes(1);
      expect(controls.reset).toHaveBeenCalledTimes(1);
      expect(controls.skip).toHaveBeenCalledTimes(1);
      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('ignores held keys and Ctrl/Cmd chords', () => {
      render(view(freshPomodoro()));
      fireEvent.keyDown(document.body, { key: ' ', repeat: true });
      fireEvent.keyDown(document.body, { key: 'r', ctrlKey: true });
      expect(controls.toggle).not.toHaveBeenCalled();
      expect(controls.reset).not.toHaveBeenCalled();
    });

    it('Space on a focused button presses the button, not the timer', () => {
      render(view(freshPomodoro()));
      const reset = screen.getByRole('button', { name: 'Reset' });
      reset.focus();
      key(' ', reset);
      expect(controls.toggle).not.toHaveBeenCalled();
      // Escape still closes from a focused button (after clicking Start).
      key('Escape', reset);
      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('does nothing while typing or under a dialog', () => {
      render(<>{view(freshPomodoro())}<input aria-label="Notes" /></>);
      const input = screen.getByLabelText('Notes');
      input.focus();
      key(' ', input);
      key('r', input);
      expect(controls.toggle).not.toHaveBeenCalled();
      expect(controls.reset).not.toHaveBeenCalled();
      input.blur();

      fireEvent.click(screen.getByRole('button', { name: 'Timer settings' }));
      key('s');
      key(' ');
      expect(controls.skip).not.toHaveBeenCalled();
      expect(controls.toggle).not.toHaveBeenCalled();
    });
  });

  describe('paper exam', () => {
    const examRunning = () => startTimer(freshPomodoro({ mode: 'exam', examSection: 'Mathematics', examFullBoard: true }), T0);

    it('R and S ask before ending or restarting a section in progress', () => {
      render(view(examRunning(), T0 + 30 * 60_000));
      key('s');
      const confirm = screen.getByRole('dialog', { name: 'End the Mathematics section now?' });
      expect(confirm).toHaveTextContent('ESAS is next.');
      expect(controls.skip).not.toHaveBeenCalled();
      fireEvent.click(within(confirm).getByRole('button', { name: 'End section' }));
      expect(controls.skip).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).toBeNull();

      key('r');
      fireEvent.click(within(screen.getByRole('dialog', { name: 'Restart the Mathematics section?' })).getByRole('button', { name: 'Keep going' }));
      expect(controls.reset).not.toHaveBeenCalled();
    });

    it('asks before leaving or switching section mid-exam; acts at once when nothing is in progress', () => {
      const { rerender } = render(view(examRunning(), T0 + 60_000));
      fireEvent.click(screen.getByRole('radio', { name: 'Focus' }));
      expect(screen.getByRole('dialog', { name: 'Leave the paper exam?' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Leave the exam' }));
      expect(controls.setMode).toHaveBeenCalledWith('focus');

      rerender(view(freshPomodoro({ mode: 'exam' })));
      fireEvent.click(screen.getByRole('radio', { name: /EE/ }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(controls.setExamSection).toHaveBeenCalledWith('EE');
      fireEvent.click(screen.getByRole('button', { name: 'End section' }));
      expect(controls.skip).toHaveBeenCalledTimes(1);
    });

    it('full board in order is a checkbox', () => {
      render(view(freshPomodoro({ mode: 'exam' })));
      fireEvent.click(screen.getByRole('checkbox', { name: /Full board in order/ }));
      expect(controls.setExamFullBoard).toHaveBeenCalledWith(true);
      expect(screen.getByText(/counts as focus time for Math/)).toBeInTheDocument();
    });
  });

  describe('a11y', () => {
    it('focus mode has no axe violations', async () => {
      const { container } = render(view(freshPomodoro()));
      expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
    });

    it('a running paper exam has no axe violations', async () => {
      const { container } = render(view(startTimer(freshPomodoro({ mode: 'exam', examSection: 'EE' }), T0), T0 + 60_000));
      expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
    });
  });
});
