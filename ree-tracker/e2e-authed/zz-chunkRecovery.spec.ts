import { test, expect, type Route } from '@playwright/test';
import { signIn } from './helpers';

// A screen's code failing to download, on a built app. No service worker here: it would
// answer from its cache, and the failure has to reach the page. Reads only, so any order.
test.use({ baseURL: 'http://localhost:4173', serviceWorkers: 'block' });

const LIBRARY = '**/assets/v2-Library-*.js';

test('a failed download recovers by itself: the app reloads and the screen opens', async ({ page }) => {
  await signIn(page);
  let failures = 0;
  await page.route(LIBRARY, (route: Route) => {
    if (failures === 0) { failures += 1; return route.abort('failed'); }
    return route.continue();
  });
  await page.goto('/library');
  await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/couldn’t load/)).toHaveCount(0);
  expect(failures).toBe(1);
});

test('a download that keeps failing says so, offers a reload, and doesn’t reload for ever', async ({ page }) => {
  await signIn(page);
  await page.route(LIBRARY, (route: Route) => route.fulfill({ status: 404, body: 'gone' }));
  let loads = 0;
  page.on('load', () => { loads += 1; });
  await page.goto('/library');
  const card = page.getByRole('alert').filter({ hasText: 'Library couldn’t load' });
  await expect(card).toBeVisible({ timeout: 40_000 });
  await expect(card).toContainText('couldn’t be downloaded');
  await expect(card.getByRole('button', { name: 'Reload page' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  // The first load, one reload, and one more after clearing the worker.
  await page.waitForTimeout(3_000);
  expect(loads).toBeLessThanOrEqual(3);

  // The file is back: Reload page works.
  await page.unroute(LIBRARY);
  await card.getByRole('button', { name: 'Reload page' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible({ timeout: 30_000 });
});
