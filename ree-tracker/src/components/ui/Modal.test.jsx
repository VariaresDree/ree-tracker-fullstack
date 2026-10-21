// Regression test for the nested-modal scroll-lock bug: two Modals open at
// once (the review-queue modal behind the Accept-All confirm modal), with a
// parent re-render in between (inline onClose arrows are the norm at every
// call site — see LibraryOverview.jsx). Before the module-level counter, a
// re-render during that nesting tore down and rebuilt the effects in
// destroy(inner) -> destroy(outer) -> setup(outer) -> setup(inner) order,
// which made the outer modal capture 'hidden' as its "restore" value and
// left document.body.style.overflow stuck on 'hidden' forever after both
// modals closed — the reported "can't scroll after Accept All" freeze.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal — body scroll lock', () => {
  it('restores the original overflow after nested modals close, even across parent re-renders', () => {
    document.body.style.overflow = '';

    function Harness({ innerOpen, outerOpen }) {
      return (
        <>
          <Modal open={outerOpen} onClose={() => {}} title="Outer">
            <p>outer</p>
          </Modal>
          <Modal open={innerOpen} onClose={() => {}} title="Inner">
            <p>inner</p>
          </Modal>
        </>
      );
    }

    const { rerender } = render(<Harness outerOpen={true} innerOpen={true} />);
    expect(document.body.style.overflow).toBe('hidden');

    // Parent re-render with fresh inline handlers (the real-world case) must
    // not perturb the lock while both modals remain open.
    rerender(<Harness outerOpen={true} innerOpen={true} />);
    expect(document.body.style.overflow).toBe('hidden');

    // Close the inner (nested) modal first — outer is still open.
    rerender(<Harness outerOpen={true} innerOpen={false} />);
    expect(document.body.style.overflow).toBe('hidden');

    // Close the outer modal — the lock must fully release.
    rerender(<Harness outerOpen={false} innerOpen={false} />);
    expect(document.body.style.overflow).toBe('');
  });

  it('a parent re-render with a new inline onClose does not tear down and rebuild the lock', () => {
    document.body.style.overflow = '';

    function Harness({ tick }) {
      // A fresh arrow every render — matches every real call site.
      return (
        <Modal open={true} onClose={() => tick} title="Solo">
          <p>content</p>
        </Modal>
      );
    }

    const { rerender, unmount } = render(<Harness tick={0} />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<Harness tick={1} />);
    rerender(<Harness tick={2} />);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});

// The note editor's footer sat under the iOS keyboard: the dialog was centred
// in a page the keyboard covers without shrinking.
describe('Modal — keyboardSafe', () => {
  it('sits at the top on a phone, caps at 85dvh, and sticks the footer to the bottom of a scrolling body', () => {
    render(<Modal open onClose={() => {}} title="Add a note" keyboardSafe footer={<button type="button">Save note</button>}><textarea aria-label="Note" /></Modal>);
    const dialog = screen.getByRole('dialog', { name: 'Add a note' });
    expect(dialog.className).toMatch(/max-h-\[85dvh\]/);
    expect(dialog.className).not.toMatch(/max-h-\[90dvh\]/);
    expect(dialog.parentElement.closest('.fixed').className).toMatch(/items-start/);
    const footer = screen.getByRole('button', { name: 'Save note' }).parentElement;
    expect(footer.className).toMatch(/sticky bottom-0/);
    expect(footer.parentElement.className).toMatch(/overflow-y-auto/);
    expect(footer.parentElement).toContainElement(screen.getByLabelText('Note'));
  });

  it('is solid, not glass: the page under it would show through the text', () => {
    render(<Modal open onClose={() => {}} title="Add a note">x</Modal>);
    const dialog = screen.getByRole('dialog', { name: 'Add a note' });
    expect(dialog).toHaveClass('bg-surface');
    expect(dialog).not.toHaveClass('surface-glass');
  });
});
