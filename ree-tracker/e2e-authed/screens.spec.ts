import { test, expect } from '@playwright/test';
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
  ...tabs('/exams', ['mock', 'gauntlet', 'battles', 'rankings', 'history']),
  ...tabs('/progress', ['overview', 'topics', 'weak-spots', 'confidence', 'habits', 'syllabus', 'plan']),
  ...tabs('/library', ['formulas', 'handouts', 'bookmarks', 'notebook', 'quizzes']),
  '/account',
  ...tabs('/admin', ['questions', 'explanations', 'references', 'handouts', 'ai']),
  '/simulator',
  '/diagnostic',
  '/focus',
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
