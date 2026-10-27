import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { signIn } from './helpers';

// A Markdown pipe table in a stem prints as a table: header, aligned cells,
// math in a cell, black rules on the white sheet. The stem is the exam-export
// fixture's table item (t03), typed into a real printed set's item 1.
const require = createRequire(import.meta.url);
const tricky = require('../src/features/exam-export/__fixtures__/tricky-questions.json');
const t03 = tricky.find((q: { id: string }) => q.id === 't03');

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test('a stem with a pipe table shows a table in the print preview', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/simulator');
  await page.getByRole('button', { name: 'Print this paper' }).click();
  await expect(page).toHaveURL(/\/print\/[0-9A-HJKMNP-TV-Z]{12}$/, { timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Print' })).toBeEnabled({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Edit questions' }).click();
  await page.getByRole('button', { name: 'Edit item 1' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit item 1' });
  await dialog.getByLabel('Question').fill(t03.text);
  await expect(dialog.locator('.ree-edit-preview table')).toBeVisible();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();

  const table = page.locator('.ree-sheets .ree-item[data-item="1"] table');
  await expect(table).toBeVisible();
  await expect(table.locator('th')).toHaveText(['Load', 'Power (kW)', 'Hours']);
  await expect(table.locator('tbody tr')).toHaveCount(3);
  await expect(table.locator('tbody tr').nth(1).locator('td').first().locator('.katex')).toBeVisible();
  await expect(table.locator('th').nth(1)).toHaveCSS('text-align', 'right');
  await expect(table.locator('td').first()).toHaveCSS('border-top-color', 'rgb(0, 0, 0)');
  await expect(table.locator('td').first()).toHaveCSS('color', 'rgb(0, 0, 0)');
  expect(await page.locator('.ree-sheets').innerText()).not.toContain('| Load');

  await page.emulateMedia({ media: 'print' });
  await expect(table).toBeVisible();
  await expect(table.locator('td').first()).toHaveCSS('border-top-color', 'rgb(0, 0, 0)');
});
