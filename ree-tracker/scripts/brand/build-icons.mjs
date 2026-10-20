// scripts/brand/build-icons.mjs
//
// Renders every app icon from the mark's one geometry source
// (src/components/ui/logoGeometry.js) in Chromium: the favicon, the PWA and
// iPhone icons, the web notification badge, and Android's launcher icons,
// splash screens and notification icon (the list is in iconSpecs.mjs). The
// outputs are committed; run this again after changing the mark.
//
//   node scripts/brand/build-icons.mjs            (from ree-tracker/)
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/brand/build-icons.mjs
//
// Dev-only: nothing here ships.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { logoSvg } from '../../src/components/ui/logoGeometry.js';
import { FAVICON, ICONS, SPLASH_MARK } from './iconSpecs.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const write = (file, data) => {
  const path = resolve(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  console.log(`wrote ${file} (${data.length} bytes)`);
};

// A .ico holding PNG images (Windows Vista and every browser since read them).
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, png }, i) => {
    const o = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, o);
    head.writeUInt8(size >= 256 ? 0 : size, o + 1);
    head.writeUInt16LE(1, o + 4); // colour planes
    head.writeUInt16LE(32, o + 6); // bits per pixel
    head.writeUInt32LE(png.length, o + 8);
    head.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.png)]);
}

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const page = await browser.newPage();

// Draws `svg` filling a width × height box (or, for a splash, centred on
// black) and returns the PNG, clear wherever nothing is painted.
async function render(width, height, svg, splash = false) {
  await page.setViewportSize({ width, height });
  const side = Math.round(Math.min(width, height) * SPLASH_MARK);
  const body = splash
    ? `<div style="width:${width}px;height:${height}px;background:#000;display:grid;place-items:center">${logoSvg({ viewBox: FAVICON.viewBox, size: side })}</div>`
    : `<div style="width:${width}px;height:${height}px">${svg.replace('<svg ', `<svg width="${width}" height="${height}" `)}</div>`;
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${body}</body></html>`);
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width, height } });
}

const faviconSvg = logoSvg(FAVICON);
write('public/favicon.svg', faviconSvg);
const icoImages = [];
for (const size of [16, 32, 48]) icoImages.push({ size, png: await render(size, size, faviconSvg) });
write('public/favicon.ico', ico(icoImages));

for (const icon of ICONS) {
  write(icon.file, await render(icon.width, icon.height, icon.splash ? null : logoSvg(icon.svg), icon.splash));
}

await browser.close();
