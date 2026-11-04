import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fileURLToPath } from 'node:url';
import { signIn } from './helpers';

// An imported quiz on real IndexedDB: add a file, take it as practice, reload,
// come back. It records nothing on the server, so it can run in any order.
const FILE = fileURLToPath(new URL('../src/features/quiz-launcher/__fixtures__/ac-circuits.quiz', import.meta.url));

test('an imported quiz is kept on the device and picks up after a reload', async ({ page }) => {
  await signIn(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/library?tab=quizzes');
  await page.locator('input[type="file"]').setInputFiles(FILE);
  await expect(page.getByText('36 questions loaded')).toBeVisible();

  await page.reload();
  await expect(page.getByText('36 questions loaded')).toBeVisible();

  await page.getByRole('button', { name: 'Start ac-circuits.quiz' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('radio', { name: 'Practice' }).click();
  await sheet.getByRole('radio', { name: 'As in the file' }).click();
  await sheet.getByRole('button', { name: 'Start quiz' }).click();

  const q1 = page.getByText(/the total voltage in a series RL circuit/i);
  await expect(q1).toBeVisible({ timeout: 20_000 });
  const choices = page.getByRole('radiogroup', { name: 'Answer choices' }).getByRole('radio');
  const order = await choices.allInnerTexts();

  // Practice shows the answer as soon as a choice is picked.
  await page.getByText('leads, between 0° to 90°').click();
  const score = page.getByText('1/1 correct');
  await expect(score).toBeVisible();

  // Saved as it goes: a reload is the same item, the same order, the same score.
  await page.waitForTimeout(300);
  await page.reload();
  await expect(q1).toBeVisible({ timeout: 20_000 });
  await expect(score).toBeVisible();
  const resumed = await choices.allInnerTexts();
  const letterless = (t: string) => t.split('\n').find((line) => line.includes('°'));
  expect(resumed.map(letterless)).toEqual(order.map(letterless));

  await page.waitForFunction(() => document.getAnimations()
    .every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity));
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious').map((v) => v.id)).toEqual([]);

  await page.getByRole('button', { name: 'Leave' }).click();
  await expect(page.getByText('Unfinished: 1 of 36 answered')).toBeVisible();
});
