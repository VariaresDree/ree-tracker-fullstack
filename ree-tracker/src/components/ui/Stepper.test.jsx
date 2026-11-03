import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Stepper } from './Stepper';

const show = (props = {}) => {
  const onChange = vi.fn();
  render(<Stepper label="Items" value={5} onChange={onChange} {...props} />);
  return onChange;
};

describe('Stepper', () => {
  it('steps down and up, named for what it counts', () => {
    const onChange = show();
    fireEvent.click(screen.getByRole('button', { name: 'Fewer: Items' }));
    expect(onChange).toHaveBeenLastCalledWith(4);
    fireEvent.click(screen.getByRole('button', { name: 'More: Items' }));
    expect(onChange).toHaveBeenLastCalledWith(6);
  });

  it('takes a typed number, kept in range, and an empty box as the minimum', () => {
    const onChange = show({ min: 1, max: 20 });
    const box = screen.getByRole('spinbutton', { name: 'Items' });
    fireEvent.change(box, { target: { value: '12' } });
    expect(onChange).toHaveBeenLastCalledWith(12);
    fireEvent.change(box, { target: { value: '500' } });
    expect(onChange).toHaveBeenLastCalledWith(20);
    fireEvent.change(box, { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('stops at its limits', () => {
    show({ value: 0 });
    expect(screen.getByRole('button', { name: 'Fewer: Items' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'More: Items' })).not.toBeDisabled();
  });

  it('44px on touch', () => {
    show();
    expect(screen.getByRole('button', { name: 'More: Items' }).className).toMatch(/pointer-coarse:h-11/);
  });
});
