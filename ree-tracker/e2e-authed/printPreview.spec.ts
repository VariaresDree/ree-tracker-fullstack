import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { signIn } from './helpers';

// The simulator's "Print this paper": a set is saved to the account and its
// print preview opens, with the math typeset (no "$" anywhere on the pages).
// An edit made in the preview survives a reload, Print prints once and marks
// the set printed, and the LaTeX is one file. The e2e bank has one question
// per subject, so the custom EE mock is one item long (and says so); its
// stored solution has a formula ($V = IR$, seed.cjs).

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

const isSetPatch = (method: string, url: string) => method === 'PATCH' && /\/api\/user\/printed-sets\/[0-9A-Z]{12}$/.test(new URL(url).pathname);

test('print this paper: typeset, edited in place, printed, and one .tex', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/simulator');
  await page.getByRole('button', { name: 'Print this paper' }).click();
  await expect(page).toHaveURL(/\/print\/[0-9A-HJKMNP-TV-Z]{12}$/, { timeout: 30_000 });
  const id = new URL(page.url()).pathname.split('/').pop();

  // Typeset, with no TeX source showing.
  const root = page.locator('.ree-print-root');
  const sheets = page.locator('.ree-sheets');
  await expect(sheets.locator('.katex').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Print' })).toBeEnabled({ timeout: 30_000 });
  expect(await root.innerText()).not.toContain('$');
  await expect(sheets.locator('svg[data-sheet-page="1"]')).toBeVisible();
  await expect(sheets.getByText('Page 1 of 1').first()).toBeVisible();

  // Edit item 1 in place; the change is saved to the account.
  await page.getByRole('button', { name: 'Edit questions' }).click();
  await page.getByRole('button', { name: 'Edit item 1' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit item 1' });
  await dialog.getByLabel('Question').fill('E2E edited: $\\frac{1}{2}$');
  await expect(dialog.locator('.ree-edit-preview .katex .mfrac')).toBeVisible();
  const saved = page.waitForResponse((r) => isSetPatch(r.request().method(), r.url()));
  await dialog.getByRole('button', { name: 'Save' }).click();
  expect((await saved).ok()).toBe(true);
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();

  await page.reload();
  const item = page.locator('.ree-sheets .ree-item[data-item="1"]');
  await expect(item).toContainText('E2E edited:', { timeout: 30_000 });
  await expect(item.locator('.katex .mfrac')).toBeVisible();
  expect(await root.innerText()).not.toContain('$');

  // Print: once, after the fonts, and the set is marked printed.
  await page.evaluate(() => {
    (window as unknown as { prints: number }).prints = 0;
    window.print = () => { (window as unknown as { prints: number }).prints += 1; };
  });
  const printed = page.waitForResponse((r) => isSetPatch(r.request().method(), r.url()) && r.request().postDataJSON()?.printed === true);
  await expect(page.getByRole('button', { name: 'Print' })).toBeEnabled({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Print' }).click();
  const res = await printed;
  expect((await res.json()).item.printedAt).toBeTruthy();
  expect(await page.evaluate(() => (window as unknown as { prints: number }).prints)).toBe(1);

  // One .tex file: one preamble, every part numbering its own pages.
  await page.getByRole('button', { name: 'More' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download .tex' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^REE-EE-SET[A-D]-\d{4}-\d{2}-\d{2}\.tex$/);
  const source = fs.readFileSync((await download.path())!, 'utf8');
  expect(source).toMatch(/^\\documentclass/m);
  expect(source.match(/\\documentclass/g)).toHaveLength(1);
  expect(source).toContain('\\reepart{paper}');
  expect(source).toContain('E2E edited:');
  expect(source).toContain(id!.slice(0, 4));
});
