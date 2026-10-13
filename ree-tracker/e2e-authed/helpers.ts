import { expect, type Page } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { EMAIL, PASSWORD } = require('./seed.cjs');

/** Sign in through the real login form, against the Auth emulator. */
export async function signIn(page: Page) {
  await page.goto('/');
  await page.getByLabel(/Email address/i).fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Where you stand, and what to do next' })).toBeVisible({ timeout: 20_000 });
}
