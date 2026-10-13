import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signIn } from './helpers';

// Signed in, against the real backend: Today's loop, a focus block fixed from
// Habits, a battle question's key kept out of Bookmarks, and axe on the
// signed-in screens (Phase 2's authed-screen check, which was manual).

const seriousOrWorse = async (page) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious').map((v) => v.id);
};

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("Today leads with today's loop and runs it, heaviest subject first", async ({ page }) => {
  const loop = page.getByRole('listitem').filter({ hasText: "Start today's loop" });
  await expect(loop).toContainText('1 due review and 1 open mistake, mixed by board weight');
  await loop.getByRole('button', { name: 'Start' }).click();
  // EE (the due review) leads; the Math mistake follows.
  await expect(page.getByText('E2E question 1: pick A')).toBeVisible({ timeout: 20_000 });
});

test('Today has no serious accessibility violations', async ({ page }) => {
  expect(await seriousOrWorse(page)).toEqual([]);
});

test('a logged focus block can be fixed from Progress › Habits', async ({ page }) => {
  await page.goto('/progress?tab=habits');
  const recent = page.getByRole('heading', { name: 'Recent blocks' });
  await expect(recent).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /^Edit the General block/ }).click();
  await page.getByLabel('What this block was for').selectOption('EE');
  await page.getByLabel(/^Focus minutes, up to/).fill('20');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Focus block updated.')).toBeVisible();
  await expect(page.getByText(/· EE · 20 min/)).toBeVisible();
  expect(await seriousOrWorse(page)).toEqual([]);
});

test("a bookmarked question in the learner's live battle shows no answer", async ({ page }) => {
  await page.goto('/library?tab=bookmarks');
  await page.getByRole('button', { name: 'Show question' }).first().click();
  await expect(page.getByText("This question is in a battle you're still in. Its answer shows here once the battle ends.")).toBeVisible();
  await expect(page.getByText('Correct answer')).toHaveCount(0);
});
