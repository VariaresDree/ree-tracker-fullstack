import { test, expect, type Page } from '@playwright/test';
import { signIn } from './helpers';

// A real PDF through the real pdf.js worker, on both screens that read one.
// Only a browser can catch this: pdf.js disables its worker under Node, so the
// missing workerSrc (every PDF failed, photos worked) passed every unit test.
// The AI is stubbed; what it was sent proves the text came out of the file.

const SENTENCE = 'Real power in a three phase load equals root three times line voltage times line current times power factor.';

/** A one-page PDF with `text` on it (none = what a scan yields). */
function pdfFile(name: string, text: string) {
  const content = text ? `BT /F1 10 Tf 40 700 Td (${text}) Tj ET` : '';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets = objects.map((object, i) => {
    const at = body.length;
    body += `${i + 1} 0 obj\n${object}\nendobj\n`;
    return at;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const at of offsets) body += `${String(at).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(body, 'latin1') };
}

/** Answer every AI call with `items`; resolves to the bodies the app sent. */
async function stubAi(page: Page, items: unknown[]) {
  const sent: string[] = [];
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  await page.route('**/api/ai/generate', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    sent.push(route.request().postData() || '');
    return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ text: JSON.stringify({ items }), model: 'stub', provider: 'stub' }) });
  });
  return sent;
}

const QUESTION = { text: 'What is the real power?', options: ['1 kW', '2 kW', '3 kW', '4 kW'], answer: '2 kW', type: 'calculation', difficulty: 2, subtopic: 'All', fixedExplanation: 'Because.' };

test.describe('reading a PDF', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'admin');
  });

  test('question extraction reads the text and sends it to the AI', async ({ page }) => {
    const sent = await stubAi(page, [QUESTION]);
    await page.goto('/admin?tab=questions&view=add&how=file');
    await page.getByLabel('Upload a PDF or image').setInputFiles(pdfFile('reviewer.pdf', SENTENCE));
    await page.getByRole('button', { name: 'Extract questions' }).click();
    await expect.poll(() => sent.length, { timeout: 20_000 }).toBe(1);
    expect(sent[0]).toContain(SENTENCE);
  });

  test('question extraction stops on a scanned PDF, without calling the AI', async ({ page }) => {
    const sent = await stubAi(page, [QUESTION]);
    await page.goto('/admin?tab=questions&view=add&how=file');
    await page.getByLabel('Upload a PDF or image').setInputFiles(pdfFile('scan.pdf', ''));
    await page.getByRole('button', { name: 'Extract questions' }).click();
    await expect(page.getByText('This PDF looks scanned. Upload its pages as images.').first()).toBeVisible({ timeout: 20_000 });
    expect(sent).toEqual([]);
  });

  test('formula cards read a PDF too', async ({ page }) => {
    const sent = await stubAi(page, []);
    await page.goto('/admin?tab=references');
    await page.getByRole('radio', { name: 'AI generate' }).click();
    await page.getByRole('radio', { name: 'From a file' }).click();
    await page.getByLabel('Reviewer file').setInputFiles(pdfFile('sheet.pdf', SENTENCE));
    await page.getByRole('button', { name: /^Make cards from/ }).click();
    await expect.poll(() => sent.length, { timeout: 20_000 }).toBe(1);
    expect(sent[0]).toContain(SENTENCE);
  });
});
