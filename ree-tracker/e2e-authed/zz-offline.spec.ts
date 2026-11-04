import { test, expect, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { signIn } from './helpers';

// The app with the network really cut, against a built app and its real service
// worker (the dev server has none, so a lazy screen would just fail to load). It signs
// in once online, then everything below runs from the device, reloads included, and
// the answer and bookmark reach the real server on reconnect. The file's name runs it
// last: it records an answer, which changes what Today's loop holds for the other specs.
//
// Twice, because a cut network comes in two kinds. In airplane mode the browser knows
// (navigator.onLine is false). On Wi-Fi with no internet it doesn't: requests just fail,
// and the app has to notice. setOffline alone gives the second: after a navigation
// Chromium reports online while nothing connects, so the first needs the flag set by hand.
const require = createRequire(import.meta.url);
const { jsPDF } = require('jspdf');

test.use({ baseURL: 'http://localhost:4173' });
// Installing the service worker and walking every screen.
test.setTimeout(240_000);

const QUIZ = fileURLToPath(new URL('../src/features/quiz-launcher/__fixtures__/ac-circuits.quiz', import.meta.url));

const tellTheBrowser = (page: Page, offline: boolean) => page.evaluate((off) => {
  localStorage.setItem('e2e-offline', off ? '1' : '0');
  window.dispatchEvent(new Event(off ? 'offline' : 'online'));
}, offline);

const samplePdf = () => {
  const doc = new jsPDF();
  doc.text('First page', 20, 20);
  doc.addPage();
  doc.text('Second page', 20, 20);
  return Buffer.from(doc.output('arraybuffer'));
};

// Every full load below comes from the service worker's cache.
const open = async (page: Page, path: string) => {
  await page.goto(path);
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
};

for (const { kind, browserKnows } of [
  { kind: 'airplane mode', browserKnows: true },
  { kind: 'Wi-Fi with no internet', browserKnows: false },
]) test(`${kind}: sign in once, then practise, sit exams and read files offline, and it all syncs on reconnect`, async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (browserKnows) {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'onLine', { get: () => localStorage.getItem('e2e-offline') !== '1' });
    });
  }

  await test.step('online: the device gets everything it needs', async () => {
    await signIn(page);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });

    await open(page, '/account#offline');
    await expect(page.getByText(/\d+ saved for offline/).first()).toBeVisible({ timeout: 60_000 });

    await open(page, '/library?tab=bookmarks');
    await expect(page.getByText(/E2E question 3/).first()).toBeVisible({ timeout: 20_000 });

    await open(page, '/library?tab=files');
    await page.locator('input[type="file"]').setInputFiles({ name: 'sample.pdf', mimeType: 'application/pdf', buffer: samplePdf() });
    await expect(page.getByRole('button', { name: 'Open sample.pdf' })).toBeVisible();

    await open(page, '/library?tab=quizzes');
    await page.locator('input[type="file"]').setInputFiles(QUIZ);
    await expect(page.getByText('36 questions loaded')).toBeVisible();
    await page.waitForTimeout(300);
  });

  await context.setOffline(true);
  if (browserKnows) await tellTheBrowser(page, true);

  await test.step('the app boots with no network, and Today offers a set from the device', async () => {
    await page.goto('/');
    await expect(page.getByText('Up next', { exact: true })).toBeVisible({ timeout: 20_000 });
    const lead = page.getByRole('region', { name: 'Practise from this device' });
    // With no word from the browser, once the app sees requests failing.
    await expect(lead).toContainText('not today’s loop', { timeout: 30_000 });
    await lead.getByRole('button', { name: 'Start' }).click();
  });

  let answered = '';
  await test.step('a Today set runs from the pack, says so, and an answer and a bookmark wait', async () => {
    await expect(page.getByText(/You’re offline, so this is a mix/)).toBeVisible({ timeout: 20_000 });
    const question = page.getByText(/E2E question (1|2|4): pick A/).first();
    await expect(question).toBeVisible();
    answered = (await question.innerText()).match(/E2E question \d/)![0];
    await page.getByRole('button', { name: 'Save to bookmarks' }).click();
    await expect(page.getByRole('button', { name: 'Remove from bookmarks' })).toBeVisible();
    await page.getByRole('radiogroup', { name: 'Confidence level' }).getByRole('radio').first().click();
    await page.getByRole('radiogroup', { name: 'Answer choices' }).getByRole('radio').first().click();
    await expect(page.getByRole('heading', { level: 2, name: 'Solution' })).toBeVisible();
  });

  await test.step('Weak spots starts offline', async () => {
    await open(page, '/practice');
    await page.getByRole('button', { name: 'Start Weak spots' }).click();
    await expect(page.getByText(/You’re offline.*(drill|mix)/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/E2E question \d: pick A/).first()).toBeVisible();
  });

  await test.step('Bookmarks shows the saved copy and the one waiting to be sent', async () => {
    await open(page, '/library?tab=bookmarks');
    await expect(page.getByText(/E2E question 3/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(new RegExp(answered)).first()).toBeVisible();
  });

  await test.step('a mock board starts from the pack', async () => {
    await open(page, '/simulator?profile=custom');
    await page.getByRole('radiogroup', { name: 'Subject' }).getByRole('radio', { name: 'EE' }).click();
    await page.getByRole('button', { name: 'Start mock board' }).click();
    await expect(page.getByText(/E2E question 1: pick A/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-session-bar]')).toBeVisible();
  });

  await test.step('an imported quiz runs', async () => {
    await open(page, '/library?tab=quizzes');
    await page.getByRole('button', { name: 'Start ac-circuits.quiz' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('radio', { name: 'Practice' }).click();
    await sheet.getByRole('button', { name: 'Start quiz' }).click();
    await expect(page.getByRole('radiogroup', { name: 'Answer choices' })).toBeVisible({ timeout: 20_000 });
  });

  await test.step('a PDF from My files draws, with its lazy viewer and worker from the cache', async () => {
    await open(page, '/library?tab=files');
    await page.getByRole('button', { name: 'Open sample.pdf' }).click();
    const dialog = page.getByRole('dialog', { name: 'sample.pdf' });
    await expect(dialog.getByText('of 2', { exact: true })).toBeVisible({ timeout: 20_000 });
    const painted = dialog.getByRole('img', { name: 'Page 1 of 2' });
    await expect.poll(() => painted.evaluate((c: HTMLCanvasElement) => {
      const { data } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
      return data.some((v, i) => i % 4 !== 3 && v < 128);
    })).toBe(true);
  });

  await test.step('the converter works', async () => {
    await open(page, '/library?tab=conversion&cat=power');
    await expect(page.getByLabel('From', { exact: true })).toBeVisible({ timeout: 20_000 });
    await page.getByLabel('From', { exact: true }).fill('2*3');
    await expect(page.locator('output').first()).not.toBeEmpty();
  });

  await test.step('the placement test says it needs a connection', async () => {
    await page.goto('/diagnostic');
    await expect(page.getByText('The placement test needs a connection')).toBeVisible({ timeout: 20_000 });
  });

  await test.step('the lazy log out dialog opens, and the waiting count shows', async () => {
    await open(page, '/account#offline');
    await expect(page.getByText(/\d+ waiting to sync/).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Log out' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Log out?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
  });

  await test.step('nothing took a cached answer for the server: it never said Online', async () => {
    await expect(page.getByRole('status').filter({ hasText: /^Online$/ })).toHaveCount(0);
  });

  await test.step('reconnect: the answer and the bookmark reach the server', async () => {
    const telemetry = page.waitForResponse((r) => r.url().includes('/api/analytics/telemetry-bulk') && r.request().method() === 'POST', { timeout: 60_000 });
    const bookmark = page.waitForResponse((r) => r.url().endsWith('/api/bookmarks') && r.request().method() === 'POST', { timeout: 60_000 });
    await context.setOffline(false);
    if (browserKnows) await tellTheBrowser(page, false);
    expect((await telemetry).ok()).toBe(true);
    expect((await bookmark).ok()).toBe(true);
    await expect(page.getByText(/\d+ waiting to sync/)).toHaveCount(0, { timeout: 60_000 });

    // Read back from the server, not the device.
    const list = page.waitForResponse((r) => r.url().includes('/api/bookmarks?limit') && r.ok(), { timeout: 30_000 });
    await open(page, '/library?tab=bookmarks');
    expect(JSON.stringify(await (await list).json())).toContain(answered);
  });

  expect(errors).toEqual([]);
});
