import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useHideOnScroll from './useHideOnScroll';

const PAGE_HEIGHT = 3000;
const VIEW_HEIGHT = 800;

const scrollTo = (y) => act(() => {
  window.scrollY = y;
  window.dispatchEvent(new Event('scroll'));
});

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb) => { cb(); return 1; });
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: PAGE_HEIGHT });
  window.innerHeight = VIEW_HEIGHT;
  window.scrollY = 0;
});

afterEach(() => vi.unstubAllGlobals());

describe('useHideOnScroll', () => {
  it('hides reading down, and comes back scrolling up', () => {
    const { result } = renderHook(() => useHideOnScroll('/a'));
    expect(result.current.hidden).toBe(false);
    scrollTo(500);
    expect(result.current.hidden).toBe(true);
    scrollTo(450);
    expect(result.current.hidden).toBe(false);
  });

  it('stays through the first of the page', () => {
    const { result } = renderHook(() => useHideOnScroll('/a'));
    scrollTo(60);
    expect(result.current.hidden).toBe(false);
  });

  it('comes back at the end of the page, so the way out is always there', () => {
    const { result } = renderHook(() => useHideOnScroll('/a'));
    scrollTo(1000);
    expect(result.current.hidden).toBe(true);
    scrollTo(PAGE_HEIGHT - VIEW_HEIGHT);
    expect(result.current.hidden).toBe(false);
  });

  it('never hides on a page too short to scroll past the first of it', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: VIEW_HEIGHT + 50 });
    const { result } = renderHook(() => useHideOnScroll('/a'));
    scrollTo(50);
    expect(result.current.hidden).toBe(false);
  });

  it('ignores a finger resting on the glass', () => {
    const { result } = renderHook(() => useHideOnScroll('/a'));
    scrollTo(500);
    scrollTo(497);
    expect(result.current.hidden).toBe(true);
  });

  it('comes back on another page', () => {
    const { result, rerender } = renderHook(({ page }) => useHideOnScroll(page), { initialProps: { page: '/a' } });
    scrollTo(500);
    expect(result.current.hidden).toBe(true);
    rerender({ page: '/b' });
    expect(result.current.hidden).toBe(false);
  });

  it('comes back when asked (keyboard focus lands in the bar)', () => {
    const { result } = renderHook(() => useHideOnScroll('/a'));
    scrollTo(500);
    act(() => result.current.show());
    expect(result.current.hidden).toBe(false);
  });
});
