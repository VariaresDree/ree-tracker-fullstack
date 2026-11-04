import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { signIn } from './helpers';

// A backup against the real server and Postgres: the export route answers, its rows go
// into the file, and reading the file back previews them with nothing changed. It
// restores nothing, so it can run in any order.
test('a backup holds the account’s records, and a restore previews them first', async ({ page }) => {
  await signIn(page);
  await page.goto('/account#data');
  const start = page.getByRole('button', { name: /Download a backup/ });
  await expect(start).toBeVisible({ timeout: 20_000 });

  const writes: string[] = [];
  page.on('request', (r) => { if (r.method() !== 'GET' && r.url().includes('/api/user/')) writes.push(`${r.method()} ${r.url()}`); });

  const [download] = await Promise.all([page.waitForEvent('download'), start.click()]);
  expect(download.suggestedFilename()).toMatch(/^ree-backup-.*\.reebak$/);
  const saved = await download.path();
  const raw = (await readFile(saved)).toString('latin1');
  expect(raw).toContain('data/account.json');
  expect(raw).toContain('"format": "ree-backup"');
  expect(raw).toContain('learner@e2e.test');
  await expect(page.getByText(/It isn’t encrypted/)).toBeVisible();

  await page.locator('input[accept=".reebak"]').setInputFiles(saved);
  await expect(page.getByText('Your account')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/never restored: only the server grades answers/)).toBeVisible();
  expect(writes).toEqual([]);
});
