// One list of themes: the picker, the browser's theme colour and the
// pre-paint script must agree with the themes styles/index.css defines.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { THEMES, themeById } from './themes';
import { applyTexture, applyTheme } from './applyAppearance';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
const cssThemes = Object.fromEntries([...css.matchAll(/(:root|\[data-theme="([a-z]+)"\])\s*\{([^}]*)\}/g)]
  .map((m) => [m[2] || 'dark', m[3]]));

describe('themes', () => {
  it('lists exactly the themes index.css defines', () => {
    expect(THEMES.map((t) => t.id).sort()).toEqual(Object.keys(cssThemes).sort());
  });

  it("each theme's browser colour is its card surface", () => {
    for (const t of THEMES) {
      const surface = cssThemes[t.id].match(/--bg-surface:\s*(#[0-9a-f]{6})/i)?.[1].toLowerCase();
      expect(t.metaColor, t.id).toBe(surface);
    }
  });

  it('the pre-paint script in index.html uses the same colours', () => {
    const map = JSON.parse(html.match(/var META = (\{[^}]*\});/)[1]);
    expect(map).toEqual(Object.fromEntries(THEMES.map((t) => [t.id, t.metaColor])));
  });

  it('applyTheme sets data-theme (none for the default) and the theme colour', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#000000">';
    applyTheme('ocean');
    expect(document.documentElement.getAttribute('data-theme')).toBe('ocean');
    expect(document.querySelector('meta[name="theme-color"]').getAttribute('content')).toBe(themeById('ocean').metaColor);
    applyTheme('dark');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(applyTheme('no-such-theme')).toBe('dark');
  });

  it('the Plain background setting is applied before first paint and after', () => {
    expect(html).toMatch(/localStorage\.getItem\('ree-texture'\) === 'off'\)[\s\S]*?setAttribute\('data-texture', 'off'\)/);
    applyTexture(true);
    expect(document.documentElement.getAttribute('data-texture')).toBe('off');
    applyTexture(false);
    expect(document.documentElement.hasAttribute('data-texture')).toBe(false);
  });
});
