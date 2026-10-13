// Shared by the heading-outline tests (Progress tabs, Exams and Library,
// Practice, the mock-board results). Under a page's h1, a panel's headings may
// start at h2 and step down one level at a time: a skip (h1 → h3) reads to a
// screen reader as a missing section.
import { expect } from 'vitest';

export function expectNoSkippedLevels(container) {
  let previous = 1;
  container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    const level = Number(h.tagName[1]);
    expect(level, `"${h.textContent}" follows an h${previous}`).toBeLessThanOrEqual(previous + 1);
    previous = level;
  });
}
