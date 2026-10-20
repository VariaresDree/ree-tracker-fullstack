import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { signIn } from './helpers';

// The simulator's "Print or export…": the LaTeX zip holds three compile-ready
// documents for one set (with the not-an-official-PRC-document line), and the
// PDF still downloads. The e2e bank has one question per subject, so the
// paper is short and says so.

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test('the exam paper exports as a LaTeX zip and as a PDF', async ({ page }) => {
  await page.goto('/simulator');
  await page.getByRole('button', { name: 'Print or export…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Print or export the exam paper' });
  await expect(dialog).toBeVisible({ timeout: 20_000 });

  await dialog.getByRole('radio', { name: 'LaTeX (editable)' }).click();
  await dialog.getByRole('button', { name: 'Build LaTeX files' }).click();
  await expect(dialog.getByRole('heading', { name: 'LaTeX files' })).toBeVisible({ timeout: 20_000 });
  await expect(dialog.getByRole('button', { name: /^Copy .+\.tex$/ })).toHaveCount(3);

  const [zipDownload] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download all (.zip)' }).click(),
  ]);
  expect(zipDownload.suggestedFilename()).toMatch(/\.zip$/);
  const files = unzipSync(new Uint8Array(fs.readFileSync((await zipDownload.path())!)));
  const tex = Object.keys(files).filter((name) => name.endsWith('.tex'));
  expect(tex).toHaveLength(3);
  for (const name of tex) {
    const source = strFromU8(files[name]);
    expect(source, name).toMatch(/^\\documentclass/m);
    expect(source, name).toContain('\\end{document}');
    expect(source, name).toContain('not an official PRC document');
  }
  expect(Object.keys(files).some((name) => /readme/i.test(name))).toBe(true);

  await dialog.getByRole('radio', { name: 'PDF (print-ready)' }).click();
  const [pdfDownload] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Build PDF' }).click(),
  ]);
  expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/);
  expect(fs.readFileSync((await pdfDownload.path())!).subarray(0, 5).toString()).toBe('%PDF-');
});
