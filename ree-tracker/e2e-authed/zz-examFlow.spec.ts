import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signIn } from './helpers';

// A mock board from setup to results, on a phone. Nothing else takes an exam to
// its end, and axe never saw the exam room. The file's name runs it last: it
// records answers, which changes what Today's loop holds for the other specs.

const expectNoSeriousViolations = async (page) => {
  await page.waitForFunction(() => document.getAnimations()
    .every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity));
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  const bad = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  const detail = bad.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')}\n  ${n.html.slice(0, 160)}\n  ${n.failureSummary}`));
  expect(bad.map((v) => v.id), detail.join('\n')).toEqual([]);
};

test('a mock runs to its results: one row of chrome, actions in reach, no serious accessibility violations', async ({ page }) => {
  await signIn(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/simulator?profile=custom');
  await page.getByRole('radiogroup', { name: 'Subject' }).getByRole('radio', { name: 'EE' }).click();
  await page.getByRole('button', { name: 'Start mock board' }).click();
  await expect(page.getByText(/E2E question \d: pick A/)).toBeVisible({ timeout: 20_000 });

  // One row at the top, and the question right under it.
  const bar = page.locator('[data-session-bar]');
  await expect(bar).toBeVisible();
  expect((await bar.boundingBox())!.height).toBeLessThan(70);
  // All of it, on the narrowest phone too: ExamLayout clips what overflows, and a
  // bare toBeInViewport passes for a button with one pixel showing.
  const submit = page.getByRole('button', { name: 'Submit exam' });
  await expect(submit).toBeInViewport({ ratio: 1 });
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(submit).toBeInViewport({ ratio: 1 });
  await page.setViewportSize({ width: 375, height: 667 });
  // To the page's end first: a control half under the sticky footer reads as too
  // small a target at that one scroll position, whatever its real size.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expectNoSeriousViolations(page);

  await page.getByRole('radiogroup', { name: 'Answer choices' }).getByRole('radio').first().click();
  await submit.click();
  const dialog = page.getByRole('dialog', { name: 'Submit this exam?' });
  await dialog.getByRole('button', { name: 'Submit exam' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Mock board results' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Exit review' })).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Answer choices' })).toBeVisible();
  await expectNoSeriousViolations(page);
});
