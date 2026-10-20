// @vitest-environment node
// The app icons are drawn from the mark by scripts/brand/build-icons.mjs and
// committed. These checks keep them in step with that list and with where
// they are used: the favicon matches the geometry, every icon exists at its
// size, and the manifest, the HTML and Android point at files that are there.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { logoSvg } from '../components/ui/logoGeometry';
import { FAVICON, ICONS } from '../../scripts/brand/iconSpecs.mjs';

const read = (file, enc) => fs.readFileSync(path.resolve(process.cwd(), file), enc);
const exists = (file) => fs.existsSync(path.resolve(process.cwd(), file));
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pngSize = (buf) => ({ width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) });
const RES = 'android/app/src/main/res';

describe('app icons', () => {
  it('the favicon is the mark as logoGeometry draws it today', () => {
    expect(read('public/favicon.svg', 'utf8')).toBe(logoSvg(FAVICON));
  });

  it('every icon is a PNG at its size', () => {
    for (const icon of ICONS) {
      const buf = read(icon.file);
      expect(buf.subarray(0, 8).equals(PNG), icon.file).toBe(true);
      expect(pngSize(buf), icon.file).toEqual({ width: icon.width, height: icon.height });
    }
  });

  it('favicon.ico holds 16, 32 and 48 px PNGs', () => {
    const ico = read('public/favicon.ico');
    expect(ico.readUInt16LE(2)).toBe(1);
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => {
      const o = 6 + 16 * i;
      const offset = ico.readUInt32LE(o + 12);
      expect(ico.subarray(offset, offset + 8).equals(PNG)).toBe(true);
      return ico.readUInt8(o);
    });
    expect(sizes).toEqual([16, 32, 48]);
  });

  it('the web manifest and the page link icons that exist, with maskable ones apart', () => {
    const config = read('vite.config.js', 'utf8');
    const icons = [...config.matchAll(/src: '\/([^']+)', sizes: '(\d+)x\d+', type: 'image\/png', purpose: '(\w+)'/g)];
    expect(icons.map((m) => m[3]).sort()).toEqual(['any', 'any', 'maskable', 'maskable']);
    for (const [, file] of icons) expect(exists(`public/${file}`), file).toBe(true);
    const html = read('index.html', 'utf8');
    for (const [, file] of html.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="\/([^"]+)"/g)) {
      expect(exists(`public/${file}`), file).toBe(true);
    }
  });

  it('Android finds its launcher layers and the reminder icon at every density', () => {
    for (const xml of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
      const adaptive = read(`${RES}/mipmap-anydpi-v26/${xml}`, 'utf8');
      for (const [, name] of adaptive.matchAll(/@mipmap\/(\w+)/g)) {
        expect(exists(`${RES}/mipmap-xxxhdpi/${name}.png`), name).toBe(true);
      }
    }
    const { smallIcon } = JSON.parse(read('capacitor.config.json', 'utf8')).plugins.LocalNotifications;
    for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
      expect(exists(`${RES}/drawable-${d}/${smallIcon}.png`), d).toBe(true);
    }
  });
});
