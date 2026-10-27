import { test, expect } from '@playwright/test';
import { signIn } from './helpers';
import { decodePng, encodePng } from './png';
// Plain ESM with explicit extensions, so Playwright's Node can load it.
import { cameraH, mulberry32, photograph } from '../src/features/omr/__fixtures__/synthSheet.js';

// The answer-sheet scanner, end to end in a real browser: a mixed paper is
// printed (the e2e bank has one question per subject, so it is three items
// long), its real SVG answer sheet is shaded (item 1 right, item 2 wrong,
// item 3 marked twice), screenshotted, "photographed" in Node (perspective,
// a tilt, noise, a lighting gradient), and uploaded through "Choose from
// gallery". The headless browser has no camera, so only the photo buttons
// show. The review flags the double mark, the taker's name is entered, the
// sheet scores 1 of 3, and the set's results list the taker.

test.use({ deviceScaleFactor: 2 });

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

const letterIndex = (l: string) => l.charCodeAt(0) - 65;

test('a taker’s sheet: shaded, photographed, read, reviewed, scored and listed in the results', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/simulator?profile=prc_blended');
  await page.getByRole('button', { name: 'Print this paper' }).click();
  await expect(page).toHaveURL(/\/print\/[0-9A-HJKMNP-TV-Z]{12}$/, { timeout: 30_000 });
  const id = new URL(page.url()).pathname.split('/').pop()!;

  // The key, from the answer key document.
  const sheets = page.locator('.ree-sheets');
  await expect(sheets.locator('.ree-key-row').first()).toBeVisible({ timeout: 30_000 });
  const key = await sheets.locator('.ree-key-row').evaluateAll((rows) => rows.map((r) => (r as HTMLElement).dataset.letter || '-'));
  expect(key).toHaveLength(3);
  expect(key.every((l) => /^[A-F]$/.test(l))).toBe(true);

  // The answer sheet only.
  await page.getByRole('checkbox', { name: 'Question paper' }).uncheck();
  await page.getByRole('checkbox', { name: 'Answer key' }).uncheck();
  const svg = sheets.locator('svg[data-sheet-page="1"]');
  await expect(svg).toBeVisible();
  await expect(svg.locator('path').first()).toBeAttached({ timeout: 15_000 }); // the QR code is drawn

  // Shade: item 1 right, item 2 a wrong option, item 3 two options.
  const right = letterIndex(key[0]);
  const wrong = (letterIndex(key[1]) + 1) % 4;
  const k3 = letterIndex(key[2]);
  const shade = [[1, right], [2, wrong], [3, k3], [3, (k3 + 2) % 4]];
  await page.evaluate((marks) => {
    for (const [n, k] of marks) {
      const c = document.querySelector(`svg[data-sheet-page="1"] circle[data-n="${n}"][data-k="${k}"]`);
      if (!c) throw new Error(`no bubble ${n}/${k}`);
      c.setAttribute('fill', '#222');
    }
  }, shade);

  // Screenshot, then a phone's photo of it, made in Node.
  const shot = decodePng(await svg.screenshot());
  const rng = mulberry32(11);
  const outW = 1500;
  const outH = 2000;
  const H = cameraH({ srcW: shot.width, srcH: shot.height, outW, outH, rng, fill: 0.86, angleDeg: 4, tilt: 0.03 });
  const photo = photograph(shot, {
    H, outW, outH, rng, blurPx: 0.9, noiseSigma: 3, light: { gradient: 0.25, vignette: 0.12 }, background: 60,
  });
  const buffer = encodePng(photo);

  // Scan it as a taker's sheet.
  await page.goto(`/scan/${id}?for=taker`);
  await expect(page.getByRole('heading', { level: 1, name: 'Scan answer sheets' })).toBeVisible();
  await expect(page.getByText('Photos stay on this device. Only the answers and the name are saved.')).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose from gallery' }).click();
  await (await chooser).setFiles({ name: 'sheet.png', mimeType: 'image/png', buffer });

  // Review: the double mark is flagged.
  await expect(page.getByRole('heading', { name: 'Check the answers' })).toBeVisible({ timeout: 30_000 });
  const flags = page.getByRole('list', { name: 'Items to check' });
  await expect(flags.getByRole('button', { name: /^Item 3: two marks/ })).toBeVisible();
  await page.getByLabel(/Taker.s name/).fill('Juan Dela Cruz');
  await page.getByRole('button', { name: 'Score this sheet' }).click();

  // The result, then the set's results.
  await expect(page.getByRole('heading', { name: 'Juan Dela Cruz' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('1 of 3', { exact: true })).toBeVisible();
  await expect(page.getByText('33.3%', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /See results/ }).click();
  await expect(page).toHaveURL(new RegExp(`/exams/paper-sets/${id}$`));
  const table = page.getByRole('table').first();
  const row = table.getByRole('row').filter({ hasText: 'Juan Dela Cruz' });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row).toContainText('1 of 3');
  await expect(row).toContainText('33.3%');
});
