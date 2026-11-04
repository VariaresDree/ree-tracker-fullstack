import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { signIn } from './helpers';

// The whole trip against the real server and Postgres: the admin shares a quiz
// file, a learner downloads it and takes it, and the admin deletes it again so the
// other specs see an empty list.
const FILE = fileURLToPath(new URL('../src/features/quiz-launcher/__fixtures__/alternators.quiz', import.meta.url));

test('an admin shares a quiz file and a learner downloads and starts it', async ({ browser, baseURL }) => {
  const adminContext = await browser.newContext({ baseURL });
  const admin = await adminContext.newPage();
  await signIn(admin, 'admin');
  await admin.goto('/admin?tab=handouts');

  const section = admin.getByRole('region', { name: 'Quiz files' });
  await section.locator('input[type="file"]').first().setInputFiles(FILE);
  await expect(section.getByText('49 questions', { exact: true })).toBeVisible();
  await section.getByLabel('Name').fill('Alternators drill');
  await section.getByLabel('Subject').selectOption('EE');
  await section.getByRole('button', { name: 'Upload file' }).click();
  await expect(section.getByText('Alternators drill')).toBeVisible({ timeout: 20_000 });

  // A second copy is refused and names where the first one is.
  await section.locator('input[type="file"]').first().setInputFiles(FILE);
  await expect(section.getByText('49 questions', { exact: true })).toBeVisible();
  await section.getByRole('button', { name: 'Upload file' }).click();
  await expect(section.getByRole('alert')).toContainText('already here, as Alternators drill');
  await section.getByRole('button', { name: /^Remove / }).click();

  const learnerContext = await browser.newContext({ baseURL, viewport: { width: 375, height: 667 } });
  const learner = await learnerContext.newPage();
  await signIn(learner);
  await learner.goto('/library?tab=quizzes');
  await learner.getByRole('button', { name: 'Download Alternators drill' }).click();
  await expect(learner.getByText('On this device', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(learner.getByText('49 questions loaded')).toBeVisible();

  // The copy stays when the shared one goes.
  await section.getByRole('button', { name: 'Delete Alternators drill' }).click();
  await admin.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(section.getByText('Alternators drill')).toHaveCount(0);

  await learner.reload();
  await expect(learner.getByText('49 questions loaded')).toBeVisible();
  await learner.getByRole('button', { name: 'Start Alternators drill.quiz' }).click();
  await learner.getByRole('dialog').getByRole('button', { name: 'Start quiz' }).click();
  await expect(learner.getByRole('radiogroup', { name: 'Answer choices' })).toBeVisible({ timeout: 20_000 });

  await adminContext.close();
  await learnerContext.close();
});
