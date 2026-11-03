import { test, expect, type Page } from '@playwright/test';
import { signIn } from './helpers';

// Every screen and every tab, signed in as an admin (so Admin opens too),
// against the real backend: none may throw or fall back to an error screen.
// A hook that read its own state above the line declaring it took Admin ›
// Question bank down on first render, and no test opened that screen; this
// opens them all. An error screen is the ErrorBoundary's "… couldn’t load"
// (a section) or "Something went wrong" (the whole page).

const tabs = (path: string, ids: string[]) => ids.map((id) => `${path}?tab=${id}`);

const SCREENS = [
  '/',
  '/practice',
  ...tabs('/exams', ['mock', 'gauntlet', 'battles', 'rankings', 'history', 'paper']),
  ...tabs('/progress', ['overview', 'topics', 'weak-spots', 'confidence', 'habits', 'syllabus', 'plan']),
  ...tabs('/library', ['handouts', 'formulas', 'notebook', 'bookmarks', 'quizzes']),
  '/account',
  ...tabs('/admin', ['questions', 'explanations', 'references', 'syllabus', 'handouts', 'ai', 'health']),
  ...['add', 'add&how=import', 'add&how=file', 'add&how=manual', 'review', 'fix'].map((view) => `/admin?tab=questions&view=${view}`),
  '/simulator',
  '/diagnostic',
  '/focus',
  '/scan',
];

test('every screen and tab opens without an error', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`${new URL(page.url()).pathname}${new URL(page.url()).search}: ${err.message}`));
  await signIn(page, 'admin');

  for (const screen of SCREENS) {
    await page.goto(screen);
    // Requests settle, or give up quietly (a screen may poll).
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    const broken = page.getByText(/couldn’t load$|^Something went wrong$/);
    if (await broken.count()) errors.push(`${screen}: ${await broken.first().textContent()}`);
    // Admin really opened, rather than bouncing a learner to Today.
    if (screen.startsWith('/admin')) await expect(page).toHaveURL(/\/admin/);
  }

  expect(errors).toEqual([]);
});

// The last content on a screen, skipping what a closed or scrolling box hides,
// and where the navigation starts: the bottom of the window when it sits beside
// the page. The page's padding follows the bar, so a screen that ends under it
// has content escaping the page.
const measure = (page: Page) => page.evaluate(() => {
  const main = document.getElementById('main-content');
  const nav = document.querySelector('nav[aria-label="Primary"]');
  if (!main || !nav) return null;
  const clipped = (el: Element, bottom: number) => {
    for (let box = el.parentElement; box && box !== main; box = box.parentElement) {
      if (getComputedStyle(box).overflowY !== 'visible' && bottom > box.getBoundingClientRect().bottom + 1) return true;
    }
    return false;
  };
  let contentBottom = 0;
  for (const el of main.querySelectorAll('a, button, input, select, textarea, p, li, td, h1, h2, h3')) {
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height || getComputedStyle(el).visibility === 'hidden') continue;
    // A closed <details> still reports where its contents would be laid out.
    if (el.closest('.sr-only, [aria-hidden="true"], details:not([open]) > :not(summary)') || clipped(el, box.bottom)) continue;
    contentBottom = Math.max(contentBottom, box.bottom);
  }
  const navIsBar = getComputedStyle(nav).position === 'fixed';
  return {
    navIsBar,
    navTop: navIsBar ? nav.getBoundingClientRect().top : window.innerHeight,
    contentBottom,
    sideways: document.documentElement.scrollWidth - window.innerWidth,
  };
});

for (const width of [375, 600]) {
  test(`at ${width}px every screen ends clear of the navigation and none scrolls sideways`, async ({ page }) => {
    test.setTimeout(420_000);
    await signIn(page, 'admin');
    await page.setViewportSize({ width, height: 900 });
    const problems: string[] = [];

    for (const screen of SCREENS) {
      await page.goto(screen);
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(350); // the bar comes back at the end of a page
      const at = await measure(page);
      if (!at) continue; // /focus and an exam's own layouts have no navigation
      expect(at.navIsBar, screen).toBe(width < 600);
      if (at.sideways > 0) problems.push(`${screen}: scrolls ${at.sideways}px sideways`);
      if (at.navTop - at.contentBottom < 16) problems.push(`${screen}: ends ${Math.round(at.navTop - at.contentBottom)}px from the navigation`);
    }

    expect(problems).toEqual([]);
  });
}
