import { test, expect, type Page } from '@playwright/test';
import { signIn } from './helpers';

// The layout standard, measured in a real browser at phone and tablet widths:
// no screen scrolls sideways, a page ends clear of the bottom bar and the
// floating focus timer, and the phone header's account menu opens over a
// session's sticky toolbar (it opened under the simulator's). The header's
// timer link opens the full-screen timer (/focus), and Escape comes back.

const sidewaysOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const todaysLoop = (page: Page) => page.getByRole('region', { name: "Start today's loop" }); // Today's "Up next" hero
const SCREENS = ['/', '/practice', '/exams', '/progress', '/library', '/account', '/simulator', '/focus'];

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

for (const width of [360, 390, 820]) {
  test(`no screen scrolls sideways at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 800 });
    for (const path of SCREENS) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeAttached({ timeout: 20_000 });
      await page.waitForLoadState('networkidle');
      expect(await sidewaysOverflow(page), path).toBeLessThanOrEqual(0);
    }
  });
}

test('on a phone, a page ends clear of the bottom bar and the focus timer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/account');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
  // The header opens the full-screen timer; Escape comes back to the page.
  await page.getByRole('link', { name: 'Focus timer' }).click();
  await expect(page).toHaveURL(/\/focus$/);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
  const pill = page.getByRole('timer');
  await expect(pill).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const contentBottom = await page.locator('#main-content').evaluate((main) => {
    const last = main.lastElementChild;
    return last ? last.getBoundingClientRect().bottom : 0;
  });
  const pillTop = (await pill.boundingBox())!.y;
  const barTop = (await page.getByRole('navigation', { name: 'Primary' }).boundingBox())!.y;
  expect(contentBottom).toBeLessThanOrEqual(pillTop);
  expect(contentBottom).toBeLessThanOrEqual(barTop);
});

test("on a phone, the account menu opens over a session's toolbar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await todaysLoop(page).getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('E2E question 1: pick A')).toBeVisible({ timeout: 20_000 });
  // Scrolled, so the sticky toolbar sits just under the header, where the menu opens.
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.getByRole('button', { name: 'Account menu' }).click();
  const account = page.getByRole('link', { name: 'Account', exact: true });
  await expect(account).toBeVisible();
  const box = (await account.boundingBox())!;
  const onTop = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('a')?.textContent?.trim(), [box.x + box.width / 2, box.y + box.height / 2]);
  expect(onTop).toBe('Account');
});
