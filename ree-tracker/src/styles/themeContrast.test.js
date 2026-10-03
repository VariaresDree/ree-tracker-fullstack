// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

// Read as a file: vitest runs with css:false, which stubs CSS imports (even ?raw).
const css = fs.readFileSync(new URL('./index.css', import.meta.url), 'utf8');

// WCAG AA for every theme, computed from the tokens themselves. axe in jsdom
// cannot paint, so it never saw these: in the 2026-10-02 audit 78 text/surface
// pairs across the 13 themes were under the floor — "Correct" in the success
// green measured 1.6–1.9:1 on the light, paper and sakura themes, and muted
// labels on the --bg-surface3 chip layer failed in ten themes.
//
// The rule, per WCAG 2.1 1.4.3 / 1.4.11:
//   body text  (--text-main, --text-muted, --text-muted2) ≥ 4.5:1 on every surface;
//   status     (--accent-success, --accent-danger), which the app also uses as
//              small text, ≥ 4.5:1 on page/card/panel and on its own 12% tint
//              (QuestionCard's answered-option row), ≥ 3:1 on the chip layer.

function themes() {
    const out = {};
    for (const m of css.matchAll(/(:root|\[data-theme="([a-z]+)"\])\s*\{([^}]*)\}/g)) {
        const name = m[2] || 'default';
        const vars = {};
        for (const d of m[3].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
        out[name] = { ...(out[name] || {}), ...vars };
    }
    // a theme inherits whatever it does not set from :root
    return Object.fromEntries(Object.entries(out).map(([n, v]) => [n, { ...out.default, ...v }]));
}

const rgb = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16));
const channel = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const luminance = (h) => { const [r, g, b] = rgb(h).map(channel); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};

// QuestionCard's answered row: the status colour at 12% over --bg-surface.
const tint = (c, surface) => '#' + rgb(c).map((v, i) => Math.round(v * 0.12 + rgb(surface)[i] * 0.88).toString(16).padStart(2, '0')).join('');

const SURFACES = ['--bg-primary', '--bg-surface', '--bg-surface2', '--bg-surface3'];
const RULES = [
    ...['--text-main', '--text-muted', '--text-muted2'].flatMap((t) => SURFACES.map((s) => [t, s, 4.5])),
    ...['--accent-success', '--accent-danger'].flatMap((t) => SURFACES.map((s) => [t, s, s === '--bg-surface3' ? 3 : 4.5])),
];

describe('theme contrast (WCAG AA)', () => {
    const all = themes();

    it('parses all thirteen themes', () => {
        expect(Object.keys(all)).toHaveLength(13);
    });

    it('the contrast formula matches the WCAG reference points', () => {
        expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
        expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2); // the classic AA grey
    });

    for (const [name, t] of Object.entries(all)) {
        it(`${name}: text and status colours clear the floor on every surface`, () => {
            const failures = RULES
                .filter(([fg, bg]) => /^#[0-9a-f]{6}$/i.test(t[fg]) && /^#[0-9a-f]{6}$/i.test(t[bg]))
                .map(([fg, bg, min]) => ({ pair: `${fg} on ${bg}`, ratio: +contrast(t[fg], t[bg]).toFixed(2), min }))
                .filter((r) => r.ratio < r.min);
            expect(failures).toEqual([]);
        });

        it(`${name}: an answered option's text reads on its own tint`, () => {
            const failures = ['--accent-success', '--accent-danger']
                .map((token) => ({ token, ratio: +contrast(t[token], tint(t[token], t['--bg-surface'])).toFixed(2) }))
                .filter((r) => r.ratio < 4.5);
            expect(failures).toEqual([]);
        });
    }
});
