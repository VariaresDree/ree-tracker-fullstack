import { test, expect, type Page } from '@playwright/test';
import { signIn } from './helpers';

// Closing a handout comes back to the same folder at the same scroll position.
// The list used to unmount under the viewer, so both were lost. Handouts are
// stubbed: the seed has none, and Drive isn't needed to prove this.

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

async function stubHandouts(page: Page) {
  const materials = Array.from({ length: 40 }, (_, i) => ({
    id: `m${i}`, name: `Handout ${i}`, type: 'pdf', url: 'about:blank', folderId: 'f1', createdAt: '2026-01-01T00:00:00Z',
  }));
  await page.route('**/api/materials', (route) => (route.request().method() === 'OPTIONS'
    ? route.fulfill({ status: 204, headers: cors })
    : route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ success: true, folders: [{ id: 'f1', name: 'Machines', parentId: null }], materials }) })));
}

test('closing a handout keeps the folder and the scroll position', async ({ page }) => {
  await stubHandouts(page);
  await signIn(page);
  await page.goto('/library?tab=handouts');
  await page.getByRole('button', { name: 'Open folder Machines' }).click();
  await expect(page).toHaveURL(/folder=f1/);

  const card = page.getByText('Handout 30', { exact: true });
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page.getByRole('dialog', { name: 'Handout 30' })).toBeVisible();
  await expect(page).toHaveURL(/material=m30/);
  // Read with the viewer open: the page above the list can still be filling in
  // before the click, which moved the position 348px with no viewer involved.
  const scrolled = await page.evaluate(() => window.scrollY);
  expect(scrolled).toBeGreaterThan(200);

  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(/folder=f1/);
  await expect(page).not.toHaveURL(/material=/);
  await expect(card).toBeVisible();
  expect(Math.abs(await page.evaluate(() => window.scrollY) - scrolled)).toBeLessThan(5);
});

test('Back from a folder goes up a level', async ({ page }) => {
  await stubHandouts(page);
  await signIn(page);
  await page.goto('/library?tab=handouts');
  await page.getByRole('button', { name: 'Open folder Machines' }).click();
  await expect(page.getByText('Handout 0', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Open folder Machines' })).toBeVisible();
  await expect(page).toHaveURL(/\/library/);
});
