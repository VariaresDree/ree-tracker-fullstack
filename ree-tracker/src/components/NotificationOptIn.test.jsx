// The one-time reminder offer after a first session. It floated over the
// bottom of the screen everywhere, which on a phone covered the new practice
// summary's next steps; on Practice it now lives inside the summary.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('../services/localReminders', () => ({ scheduleDailyReminder: vi.fn() }));
let slice;
vi.mock('../store/slices', () => ({ useNotificationSlice: () => slice }));

const { default: NotificationOptIn } = await import('./NotificationOptIn');

const renderAt = (path, props) => render(
  <MemoryRouter initialEntries={[path]}><NotificationOptIn {...props} /></MemoryRouter>,
);

beforeEach(() => {
  slice = {
    notifications: { promptedForOptIn: false, reminderHour: 19, reminderMinute: 0 },
    optInEligible: true,
    setNotificationPrefs: vi.fn(),
    markOptInPrompted: vi.fn(),
  };
});

describe('NotificationOptIn', () => {
  it('floats over other pages after a session', () => {
    const { container } = renderAt('/');
    expect(screen.getByText('Keep your streak alive?')).toBeInTheDocument();
    expect(container.firstChild.className).toMatch(/\bfixed\b/);
  });

  it('while a results screen hosts it inline, the floating copy hides; it returns after', () => {
    const results = renderAt('/practice', { inline: true });
    const floating = renderAt('/progress');
    expect(screen.getAllByText('Keep your streak alive?')).toHaveLength(1);
    expect(results.container.firstChild.className).not.toMatch(/\bfixed\b/);
    expect(floating.container).toBeEmptyDOMElement();

    results.unmount();
    expect(screen.getAllByText('Keep your streak alive?')).toHaveLength(1);
    expect(floating.container.firstChild.className).toMatch(/\bfixed\b/);
  });

  it('shows only once, and "Not now" records that', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(slice.markOptInPrompted).toHaveBeenCalled();

    slice = { ...slice, notifications: { ...slice.notifications, promptedForOptIn: true } };
    const { container } = renderAt('/', { inline: true });
    expect(container).toBeEmptyDOMElement();
  });
});
