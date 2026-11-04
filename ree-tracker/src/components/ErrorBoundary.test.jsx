import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import { reportError } from '../services/appHealth';

vi.mock('../services/appHealth', () => ({ reportError: vi.fn() }));

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

  describe('a screen whose code couldn’t be downloaded', () => {
    const chunkError = new TypeError('Failed to fetch dynamically imported module: https://x/assets/v2-Library-a.js');
    function Gone() { throw chunkError; }

    it('offers a reload straight away, since trying again can’t work', () => {
      render(<ErrorBoundary name="Library"><Gone /></ErrorBoundary>);
      expect(screen.getByRole('alert')).toHaveTextContent('couldn’t be downloaded');
      expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    });

    it('tells App health only when it’s still failing after recovery', () => {
      render(<ErrorBoundary name="Library"><Gone /></ErrorBoundary>);
      expect(reportError).toHaveBeenLastCalledWith(chunkError);
      sessionStorage.setItem('ree:chunk-reload-at', '1');
      render(<ErrorBoundary name="Library"><Gone /></ErrorBoundary>);
      expect(reportError.mock.lastCall[0].message).toMatch(/^A screen still wouldn't load after reloading: .*v2-Library-a\.js$/);
      sessionStorage.clear();
    });
  });

  it('the app-level screen has an h1', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument();
  });
});
