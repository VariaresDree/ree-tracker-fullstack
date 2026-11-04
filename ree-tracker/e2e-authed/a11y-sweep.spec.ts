import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SCREENS, signIn } from './helpers';

// Two checks only a rendered page can make, across the whole app: headings that
// step in order, and text that can be read on what's actually behind it. The other
// specs scan a few screens with axe, and themeContrast.test.js works from the colour
// tokens, which can't see one colour laid over another.
const RULES = ['heading-order', 'page-has-heading-one', 'color-contrast'];

// The dark themes. Paper and Light are checked throughout the other specs.
const DARK_THEMES = { Midnight: 'midnight', Cyberpunk: 'cyberpunk', Retrowave: 'retrowave', Forest: 'forest', Ocean: 'ocean', Phosphor: 'terminal', Organs: 'organs', Math: 'math', Electrical: 'electrical' };
const MAIN_SCREENS = ['/', '/practice', '/exams?tab=mock', '/progress?tab=overview', '/library?tab=handouts', '/account'];

const scan = async (page: Page, label: string, found: string[]) => {
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  // Entrance animations first: axe measures text mid-fade as lower contrast than it ends at.
  await page.waitForFunction(() => document.getAnimations()
    .every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity));
  const { violations } = await new AxeBuilder({ page }).withRules(RULES).analyze();
  for (const v of violations) {
    for (const n of v.nodes) found.push(`${label}: ${v.id} ${n.target.join(' ')}\n  ${n.html.slice(0, 140)}\n  ${(n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 220)}`);
  }
};

test('every screen: headings step in order, and text can be read, in the default dark theme', async ({ page }) => {
  test.setTimeout(420_000);
  const found: string[] = [];
  await signIn(page, 'admin');
  for (const screen of SCREENS) {
    await page.goto(screen);
    await scan(page, screen, found);
  }
  expect(found, found.join('\n')).toEqual([]);
});

test('the main screens can be read in every dark theme', async ({ page }) => {
  test.setTimeout(480_000);
  const found: string[] = [];
  await signIn(page);
  for (const [theme, id] of Object.entries(DARK_THEMES)) {
    await page.goto('/account#appearance');
    await page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: new RegExp(`^${theme}`) }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', id);
    for (const screen of MAIN_SCREENS) {
      await page.goto(screen);
      await scan(page, `${theme} ${screen}`, found);
    }
  }
  expect(found, found.join('\n')).toEqual([]);
});
