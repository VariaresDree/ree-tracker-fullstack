import { test, expect, type Page } from '@playwright/test';
import { signIn } from './helpers';

// The page tab row, measured in a real browser: Progress's tabs come in the
// order of the questions they answer, the first label lines up with the page
// title, the row scrolls sideways only, and a deep link to the last tab opens
// with that tab in full view, clear of the edge fade.

const ORDER = ['Overview', 'Topics', 'Syllabus', 'Confidence', 'Weak spots', 'Habits', 'Study plan'];
const FADE = 32;

const strip = (page: Page) => page.getByRole('tablist', { name: 'Progress sections' });

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test('Progress tabs: the order, and the first label under the title', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/progress');
  await expect(strip(page)).toBeVisible({ timeout: 20_000 });
  expect(await strip(page).getByRole('tab').allTextContents()).toEqual(ORDER);

  const titleLeft = (await page.getByRole('heading', { level: 1, name: 'Progress' }).boundingBox())!.x;
  const labelLeft = await strip(page).getByRole('tab').first().locator('[data-tab-label]').evaluate((el) => el.getBoundingClientRect().left);
  expect(Math.abs(labelLeft - titleLeft)).toBeLessThanOrEqual(1);
});

for (const width of [360, 390]) {
  test(`at ${width}px the row scrolls sideways only, and ?tab=plan opens in view`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/progress?tab=plan');
    const row = strip(page);
    await expect(row.getByRole('tab', { name: 'Study plan' })).toHaveAttribute('aria-selected', 'true', { timeout: 20_000 });

    const box = await row.evaluate((el) => ({
      vertical: el.scrollHeight - el.clientHeight,
      sideways: el.scrollWidth - el.clientWidth,
    }));
    expect(box.vertical).toBe(0);
    expect(box.sideways).toBeGreaterThan(0);

    // Wait for the strip to settle at its scroll target.
    await expect.poll(() => row.evaluate((el) => el.scrollLeft), { timeout: 5_000 }).toBeGreaterThan(0);
    const rowBox = (await row.boundingBox())!;
    const tabBox = (await row.getByRole('tab', { name: 'Study plan' }).boundingBox())!;
    expect(tabBox.x).toBeGreaterThanOrEqual(rowBox.x + FADE - 1);
    expect(tabBox.x + tabBox.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);

    // The page itself doesn't scroll sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
}

test('each tab is named by its label alone, and the row keeps its widths as the active tab changes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/progress');
  const row = strip(page);
  await expect(row).toBeVisible({ timeout: 20_000 });
  // The hidden bold copy that reserves each label's width is not read out.
  for (const label of ORDER) await expect(row.getByRole('tab', { name: label, exact: true })).toBeVisible();
  const widths = () => row.getByRole('tab').evaluateAll((tabs) => tabs.map((t) => t.getBoundingClientRect().width));
  const before = await widths();
  await row.getByRole('tab', { name: 'Habits', exact: true }).click();
  await expect(row.getByRole('tab', { name: 'Habits', exact: true })).toHaveAttribute('aria-selected', 'true');
  const after = await widths();
  after.forEach((w, i) => expect(Math.abs(w - before[i]), ORDER[i]).toBeLessThan(0.5));
});
