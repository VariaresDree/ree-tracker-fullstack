// Timer settings (moved here from the sidebar timer, components/Pomodoro):
// minutes are kept to 1–120, Cancel leaves the timer alone, Save sends only
// what changed (so saving the same minutes never restarts a running block),
// and the long-break rhythm, auto-start, sound and subject save too.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const chime = { primeChime: vi.fn(), playChime: vi.fn() };
vi.mock('../../utils/chime', () => ({ primeChime: () => chime.primeChime(), playChime: (k) => chime.playChime(k) }));

const { default: FocusSettings } = await import('./FocusSettings');
const { freshPomodoro } = await import('../../utils/pomodoroLogic');

const pomodoro = { ...freshPomodoro(), isRunning: true, endsAt: Date.now() + 600_000, pausedRemaining: null };
const onSave = vi.fn();
const onClose = vi.fn();
const open = () => render(<FocusSettings open onClose={onClose} pomodoro={pomodoro} onSave={onSave} />);
const dialog = () => screen.getByRole('dialog', { name: 'Timer settings' });

beforeEach(() => { onSave.mockReset(); onClose.mockReset(); chime.primeChime.mockReset(); chime.playChime.mockReset(); });

describe('FocusSettings', () => {
  it('is a dialog named Timer settings, closed when not open', () => {
    const { rerender } = render(<FocusSettings open={false} onClose={onClose} pomodoro={pomodoro} onSave={onSave} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<FocusSettings open onClose={onClose} pomodoro={pomodoro} onSave={onSave} />);
    expect(dialog()).toBeInTheDocument();
    expect(within(dialog()).getByText('Changing the length of the current block restarts it.')).toBeInTheDocument();
  });

  it('Cancel changes nothing, even after edits', () => {
    open();
    fireEvent.change(screen.getByLabelText('Focus'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('Save with the same minutes sends nothing, so a running block is not restarted', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('Save sends new minutes, clamped, and keeps a cleared field', () => {
    open();
    fireEvent.change(screen.getByLabelText('Focus'), { target: { value: '999' } });
    fireEvent.change(screen.getByLabelText('Short break'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Long break'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ workDuration: 120, longBreakDuration: 20 });
  });

  it('saves the long-break rhythm, the auto-starts, the sound and the subject', () => {
    open();
    fireEvent.change(screen.getByLabelText('Long break after every'), { target: { value: '3' } });
    fireEvent.click(screen.getByLabelText('Auto-start breaks'));
    fireEvent.click(screen.getByLabelText('Auto-start focus'));
    fireEvent.click(screen.getByLabelText('Sound'));
    fireEvent.change(screen.getByLabelText('Focus on'), { target: { value: 'EE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ longEvery: 3, autoStartBreaks: true, autoStartFocus: true, sound: false, subject: 'EE' });
  });

  it('the Focus on picker is touch-sized (it measured 26px)', () => {
    open();
    expect(screen.getByLabelText('Focus on').className).toMatch(/pointer-coarse:min-h-11/);
  });

  it('plays a test sound from inside the click', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Play test sound' }));
    expect(chime.primeChime).toHaveBeenCalled();
    expect(chime.playChime).toHaveBeenCalledWith('test');
  });
});
