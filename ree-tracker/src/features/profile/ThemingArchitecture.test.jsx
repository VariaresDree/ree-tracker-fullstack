import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemingArchitecture from './ThemingArchitecture';

describe('Account › Appearance', () => {
  it('picks a theme and switches the background between textured and plain', () => {
    const setTheme = vi.fn();
    const setPlainBackground = vi.fn();
    render(<ThemingArchitecture theme="dark" setTheme={setTheme} plainBackground={false} setPlainBackground={setPlainBackground} />);
    expect(screen.getAllByRole('radio', { checked: true }).map((r) => r.textContent)).toEqual([
      expect.stringMatching(/^Original/), 'Textured',
    ]);
    fireEvent.click(screen.getByRole('radio', { name: /^Paper/ }));
    expect(setTheme).toHaveBeenCalledWith('paper');
    fireEvent.click(screen.getByRole('radio', { name: 'Plain' }));
    expect(setPlainBackground).toHaveBeenCalledWith(true);
    expect(screen.getByText(/Cards are unaffected/)).toBeInTheDocument();
  });
});
