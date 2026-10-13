import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

const usePomodoroClock = vi.fn(() => ({ pomodoro: {}, remaining: 0 }));
vi.mock('../hooks/usePomodoroClock', () => ({ usePomodoroClock: (o) => usePomodoroClock(o) }));

const { default: PomodoroOwner } = await import('./PomodoroOwner');

describe('PomodoroOwner', () => {
  it('carries the owner clock with nothing on screen', () => {
    const { container } = render(<PomodoroOwner />);
    expect(usePomodoroClock).toHaveBeenCalledWith({ owner: true });
    expect(container).toBeEmptyDOMElement();
  });
});
