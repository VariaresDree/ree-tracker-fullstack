import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { signIn } from './helpers';

// My files on real IndexedDB, and a real PDF drawn by the real pdf.js worker. It
// records nothing on the server, so it can run in any order.
const require = createRequire(import.meta.url);
const { jsPDF } = require('jspdf');

const samplePdf = () => {
  const doc = new jsPDF();
  doc.text('First page', 20, 20);
  doc.addPage();
  doc.text('Second page', 20, 20);
  return Buffer.from(doc.output('arraybuffer'));
};

test('a file stays on the device, and a PDF draws', async ({ page }) => {
  await signIn(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/library?tab=files');
  await page.locator('input[type="file"]').setInputFiles([
    { name: 'sample.pdf', mimeType: 'application/pdf', buffer: samplePdf() },
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Ohm’s law') },
  ]);
  await expect(page.getByRole('button', { name: 'Open sample.pdf' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open notes.txt' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Open sample.pdf' })).toBeVisible();

  await page.getByRole('button', { name: 'Open sample.pdf' }).click();
  const dialog = page.getByRole('dialog', { name: 'sample.pdf' });
  await expect(dialog.getByText('of 2', { exact: true })).toBeVisible({ timeout: 20_000 });
  const painted = dialog.getByRole('img', { name: 'Page 1 of 2' });
  await expect(painted).toBeVisible();
  await expect.poll(() => painted.evaluate((c: HTMLCanvasElement) => {
    const { data } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
    return data.some((v, i) => i % 4 !== 3 && v < 128);
  })).toBe(true);
  await page.goBack();
  await expect(dialog).toHaveCount(0);

  await page.getByRole('button', { name: 'Open notes.txt' }).click();
  await expect(page.getByRole('dialog', { name: 'notes.txt' }).getByText('Ohm’s law')).toBeVisible();
});
