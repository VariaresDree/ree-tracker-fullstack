import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let synced;
const useSyncedUserData = vi.fn(() => synced);
vi.mock('../../hooks/useSyncedUserData', () => ({ useSyncedUserData: (o) => useSyncedUserData(o) }));

const { default: PlacementPrompt } = await import('./PlacementPrompt');
const { usePlacement } = await import('./usePlacement');

const renderIt = (props) => render(<MemoryRouter><PlacementPrompt {...props} /></MemoryRouter>);

beforeEach(() => {
  localStorage.clear();
  useSyncedUserData.mockClear();
  synced = { value: null };
});

describe('PlacementPrompt', () => {
  it('invites a new account to the placement test', () => {
    renderIt({ status: { status: 'none' }, answered: 3 });
    expect(screen.getByText('Find your starting level')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Take the test' })).toHaveAttribute('href', '/diagnostic');
  });

  it('offers to resume an unfinished sitting, even for an experienced account', () => {
    renderIt({ status: { status: 'in_progress', progress: { answered: 7, total: 19 } }, answered: 400 });
    expect(screen.getByText('Finish your placement test')).toBeInTheDocument();
    expect(screen.getByText(/7 of about 19/)).toBeInTheDocument();
  });

  it('stays out of the way once placed, or for an established account', () => {
    expect(renderIt({ status: { status: 'completed', result: {} }, answered: 3 }).container).toBeEmptyDOMElement();
    expect(renderIt({ status: { status: 'none' }, answered: 31 }).container).toBeEmptyDOMElement();
    expect(renderIt({ status: null, answered: 0 }).container).toBeEmptyDOMElement();
  });

  it('"Not now" folds it to one line that still leads to the test', () => {
    const onDismiss = vi.fn();
    const { rerender } = renderIt({ status: { status: 'none' }, answered: 0, onDismiss });
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDismiss).toHaveBeenCalled();
    rerender(<MemoryRouter><PlacementPrompt status={{ status: 'none' }} answered={0} dismissed /></MemoryRouter>);
    expect(screen.queryByText('Find your starting level')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Take the placement test' })).toHaveAttribute('href', '/diagnostic');
  });
});

describe('usePlacement', () => {
  const result = { projectedGWA: 72, subjects: { Mathematics: { expected: 80 }, ESAS: { expected: 45 }, EE: { expected: 75 } } };

  it('works out where to start from the saved result, floor first', () => {
    synced = { value: { status: 'completed', result } };
    const { result: hook } = renderHook(() => usePlacement({ uid: 'u1', answered: 5 }));
    expect(hook.current.plan).toMatchObject({ mode: 'practice', subject: 'ESAS', reason: 'floor' });
    expect(useSyncedUserData).toHaveBeenLastCalledWith(expect.objectContaining({ endpoint: '/api/diagnostic/status', cacheName: 'placement', enabled: true }));
  });

  it('keeps the last result while a retake is in progress', () => {
    synced = { value: { status: 'in_progress', progress: { answered: 2 }, lastResult: result } };
    const { result: hook } = renderHook(() => usePlacement({ uid: 'u1', answered: 5 }));
    expect(hook.current.plan.subject).toBe('ESAS');
  });

  it('is settled once a copy shows or the read finishes, not while the first read is out', () => {
    synced = { value: null, status: 'loading' };
    expect(renderHook(() => usePlacement({ uid: 'u1', answered: 0 })).result.current.settled).toBe(false);
    synced = { value: null, status: 'offline' };
    expect(renderHook(() => usePlacement({ uid: 'u1', answered: 0 })).result.current.settled).toBe(true);
    synced = { value: { status: 'none' }, status: 'loading' };
    expect(renderHook(() => usePlacement({ uid: 'u1', answered: 0 })).result.current.settled).toBe(true);
  });

  it('stops asking once an established learner has waved it away, and remembers that per account', () => {
    const { result: hook } = renderHook(() => usePlacement({ uid: 'u1', answered: 80 }));
    expect(useSyncedUserData).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
    act(() => hook.current.dismiss());
    expect(hook.current.dismissed).toBe(true);
    expect(useSyncedUserData).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
    expect(localStorage.getItem('ree_placement_dismissed:u1')).toBe('1');
    // a new learner still sees the folded line, so it still asks
    const fresh = renderHook(() => usePlacement({ uid: 'u1', answered: 2 }));
    expect(fresh.result.current.dismissed).toBe(true);
    expect(useSyncedUserData).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
  });
});
