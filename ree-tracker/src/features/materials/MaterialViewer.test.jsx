// The handout viewer: an overlay over the list, Drive's own viewer filling it
// (the old box clipped Drive's zoom toolbar), and zoom buttons for phones,
// where Drive shows none.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import MaterialViewer from './MaterialViewer';

let wrapperProps;
vi.mock('react-zoom-pan-pinch', () => ({
  TransformWrapper: ({ children, ...props }) => {
    wrapperProps = props;
    return children({ zoomIn: vi.fn(), zoomOut: vi.fn(), resetTransform: vi.fn() });
  },
  TransformComponent: ({ children, wrapperStyle }) => <div data-testid="zoom-area" style={wrapperStyle}>{children}</div>,
}));

const DRIVE = 'https://drive.google.com/file/d/abc123/preview?usp=drive_link';
const show = (material, onClose = vi.fn()) => render(<MaterialViewer material={{ name: 'AC notes', ...material }} onClose={onClose} />);

describe('MaterialViewer', () => {
  it('is a named dialog that closes', () => {
    const onClose = vi.fn();
    show({ type: 'pdf', url: DRIVE }, onClose);
    const dialog = screen.getByRole('dialog', { name: 'AC notes' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a Drive PDF opens Drive’s viewer, and links out to Drive', () => {
    show({ type: 'pdf', url: DRIVE });
    expect(screen.getByTitle('AC notes')).toHaveAttribute('src', 'https://drive.google.com/file/d/abc123/preview');
    expect(screen.getByRole('link', { name: 'Open in Drive' })).toHaveAttribute('href', 'https://drive.google.com/file/d/abc123/view');
  });

  it('a hosted PDF keeps the browser’s own zoom toolbar', () => {
    show({ type: 'pdf', url: 'https://x.test/a.pdf' });
    expect(screen.getByTitle('AC notes')).toHaveAttribute('src', 'https://x.test/a.pdf');
    expect(screen.getByRole('link', { name: 'Open in a new tab' })).toHaveAttribute('href', 'https://x.test/a.pdf');
  });

  it('zoom widens the frame in steps and stops at each end', () => {
    show({ type: 'pdf', url: DRIVE });
    const frame = screen.getByTitle('AC notes');
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    const zoomOut = screen.getByRole('button', { name: 'Zoom out' });
    expect(frame.style.width).toBe('100%');
    expect(zoomOut).toBeDisabled();
    fireEvent.click(zoomIn);
    expect(frame.style.width).toBe('150%');
    expect(screen.getByText('150%')).toBeInTheDocument();
    fireEvent.click(zoomIn);
    fireEvent.click(zoomIn);
    expect(frame.style.width).toBe('250%');
    expect(zoomIn).toBeDisabled();
    fireEvent.click(zoomOut);
    expect(frame.style.width).toBe('200%');
  });

  it('an image zooms gently, fills the viewer and can’t shrink below its fit', () => {
    show({ type: 'image', url: 'https://x.test/a.png' });
    expect(wrapperProps.wheel.step).toBeLessThanOrEqual(0.01);
    expect(wrapperProps.minScale).toBe(1);
    expect(screen.getByTestId('zoom-area').style.height).toBe('100%');
    expect(screen.getByRole('img', { name: 'AC notes' }).className).toMatch(/object-contain/);
    for (const name of ['Zoom in', 'Zoom out', 'Reset zoom']) expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });

  it('a file it can’t show offers a new tab instead of a dead end', () => {
    show({ type: 'file', url: 'https://x.test/a.docx' });
    expect(screen.getByRole('link', { name: 'Open in a new tab' })).toHaveAttribute('href', 'https://x.test/a.docx');
  });
});
