import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

let shouldThrow;
function Boom() {
  if (shouldThrow) throw new Error('chunk failed');
  return <p>fine</p>;
}

beforeEach(() => { shouldThrow = true; vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

describe('ErrorBoundary', () => {
  it('a section says it couldn’t load, keeps the detail folded, and Try again re-renders it', () => {
    render(<ErrorBoundary name="Rankings"><Boom /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('Rankings couldn’t load');
    expect(screen.getByText('Details')).toBeInTheDocument();
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  it('after two failed retries it offers a reload instead', () => {
    render(<ErrorBoundary name="Rankings"><Boom /></ErrorBoundary>);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
  });

  it('the app-level screen has an h1', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument();
  });
});
