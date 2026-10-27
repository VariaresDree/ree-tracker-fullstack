import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signIn } from './helpers';

// Signed in, against the real backend: Today's loop, a focus block fixed from
// Habits, a battle question's key kept out of Bookmarks, and axe on the
// signed-in screens (Phase 2's authed-screen check, which was manual): Today,
// Habits, Exams, Library › Notebook, Progress › Overview and a running
// Practice session, plus Today in a dark colour theme and on a phone.

// WCAG 2.0 A/AA plus the 2.1 and 2.2 AA additions (target size, reflow,
// non-text contrast and the rest). Fails naming each offending element and
// axe's reason, so a red run says what to fix: the rule id alone (all a
// failure used to print) meant reproducing it locally first.
const expectNoSeriousViolations = async (page) => {
  // Entrance animations first: axe measures text mid-fade, at an opacity
  // under 1, as lower contrast than it ends at. Looping ones (spinners, the
  // live dot) never finish and are left out.
  await page.waitForFunction(() => document.getAnimations()
    .every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity));
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  const bad = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  const detail = bad.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')}\n  ${n.html.slice(0, 160)}\n  ${n.failureSummary}`));
  expect(bad.map((v) => v.id), detail.join('\n')).toEqual([]);
};

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

const todaysLoop = (page) => page.getByRole('region', { name: "Start today's loop" }); // Today's "Up next" hero

test("Today leads with today's loop and runs it, heaviest subject first", async ({ page }) => {
  const loop = todaysLoop(page);
  await expect(loop).toContainText('1 due review and 1 open mistake, mixed by board weight');
  await loop.getByRole('button', { name: 'Start' }).click();
  // EE (the due review) leads; the Math mistake follows.
  await expect(page.getByText('E2E question 1: pick A')).toBeVisible({ timeout: 20_000 });
});

test('Today has no serious accessibility violations', async ({ page }) => {
  // Scan Today once its data is in, not the moment the heading paints.
  await expect(todaysLoop(page)).toBeVisible({ timeout: 20_000 });
  await expectNoSeriousViolations(page);
});

test('Exams has no serious accessibility violations', async ({ page }) => {
  await page.goto('/exams');
  await expect(page.getByRole('heading', { level: 1, name: 'Exams' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('tab', { name: /Mock board/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('link', { name: /set up/i }).first()).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('Library › Notebook has no serious accessibility violations', async ({ page }) => {
  await page.goto('/library?tab=notebook');
  await expect(page.getByRole('heading', { level: 2, name: 'Notebook' })).toBeVisible({ timeout: 20_000 });
  // The seeded Math mistake, so the list (not its skeleton) is scanned.
  await expect(page.getByText('E2E question 2: pick A')).toBeVisible({ timeout: 20_000 });
  await expectNoSeriousViolations(page);
});

test('Progress › Overview has no serious accessibility violations', async ({ page }) => {
  await page.goto('/progress');
  await expect(page.getByRole('heading', { level: 2, name: 'Ability trend (θ)' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Questions answered').first()).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('Today in a dark colour theme has no serious accessibility violations', async ({ page }) => {
  // Ocean: mid-tone blue surfaces, where the accent and the status colours
  // carry the least contrast of any dark theme.
  await page.goto('/account#appearance');
  await page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: /Ocean/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean');
  await page.goto('/');
  await expect(todaysLoop(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean');
  await expectNoSeriousViolations(page);
});

test('a theme sets its texture and the browser colour; Plain turns the texture off and stays off', async ({ page }) => {
  const layer = (pseudo: '::before' | '::after') => page.evaluate((p) => getComputedStyle(document.body, p).content, pseudo);
  await page.goto('/account#appearance');
  await page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: /^Light/ }).click();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffffff');
  expect(await layer('::after')).not.toBe('none');

  await page.getByRole('radiogroup', { name: 'Background' }).getByRole('radio', { name: 'Plain' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-texture', 'off');
  expect(await layer('::before')).toBe('none');
  expect(await layer('::after')).toBe('none');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-texture', 'off');
  await expect(page.getByRole('radiogroup', { name: 'Background' }).getByRole('radio', { name: 'Plain' })).toHaveAttribute('aria-checked', 'true', { timeout: 20_000 });
  await page.getByRole('radiogroup', { name: 'Background' }).getByRole('radio', { name: 'Textured' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-texture', 'off');
});

test('Today on a phone has no serious accessibility violations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(todaysLoop(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expectNoSeriousViolations(page);
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
  await expectNoSeriousViolations(page);
});

test("a bookmarked question in the learner's live battle shows no answer", async ({ page }) => {
  await page.goto('/library?tab=bookmarks');
  await page.getByRole('button', { name: 'Show question' }).first().click();
  await expect(page.getByText("This question is in a battle you're still in. Its answer shows here once the battle ends.")).toBeVisible();
  await expect(page.getByText('Correct answer')).toHaveCount(0);
});

// Last: it records an answer, which changes what Today's loop holds.
test('a running Practice session has no serious accessibility violations, before and after an answer', async ({ page }) => {
  await todaysLoop(page).getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('E2E question 1: pick A')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Practice' })).toBeAttached();
  await expectNoSeriousViolations(page);

  // Answered, with the solution open: the result, the solution panel and Next.
  await page.getByRole('radiogroup', { name: 'Confidence level' }).getByRole('radio').first().click();
  await page.getByRole('radiogroup', { name: 'Answer choices' }).getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Show solution' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Solution' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Next question|Finish session/ })).toBeVisible();
  await expectNoSeriousViolations(page);
});
