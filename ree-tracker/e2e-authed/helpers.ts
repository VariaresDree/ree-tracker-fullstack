import { expect, type Page } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { EMAIL, PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD } = require('./seed.cjs');

const ACCOUNTS = {
  learner: { email: EMAIL, password: PASSWORD },
  admin: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
};

/** Sign in through the real login form, against the Auth emulator (the learner unless told otherwise). */
export async function signIn(page: Page, who: keyof typeof ACCOUNTS = 'learner') {
  const { email, password } = ACCOUNTS[who];
  await page.goto('/');
  await page.getByLabel(/Email address/i).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Where you stand, and what to do next' })).toBeVisible({ timeout: 20_000 });
}
