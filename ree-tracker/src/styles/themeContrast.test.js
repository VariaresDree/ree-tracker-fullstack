// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

// Read as a file: vitest runs with css:false, which stubs CSS imports (even ?raw).
// Comments are stripped first: a `}` or a `--token: value;` inside one would
// otherwise end a theme block early or read as a declaration.
const css = fs.readFileSync(new URL('./index.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

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

// `share` of colour a over colour b, as CSS color-mix(in srgb, …) mixes them.
const mix = (a, b, share) => '#' + rgb(a).map((v, i) => Math.round(v * share + rgb(b)[i] * (1 - share)).toString(16).padStart(2, '0')).join('');
// QuestionCard's answered row: the status colour at 12% over --bg-surface.
const tint = (c, surface) => mix(c, surface, 0.12);

// A token's colour as the browser computes it: follows var() (with its
// fallback) and color-mix(in srgb, A n%, B), so --accent-text and
// --focus-ring-color are checked as rendered, not skipped as non-hex.
function resolve(t, value) {
    const v = String(value ?? '').trim();
    const ref = v.match(/^var\((--[a-z0-9-]+)(?:,\s*(.+))?\)$/);
    if (ref) return resolve(t, t[ref[1]] ?? ref[2]);
    const m = v.match(/^color-mix\(in srgb,\s*(.+?)\s+(\d+)%,\s*(.+)\)$/);
    if (m) return mix(resolve(t, m[1]), resolve(t, m[3]), Number(m[2]) / 100);
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    throw new Error(`unresolvable colour: ${value}`);
}

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

        // --accent-text is every foreground use of the accent: active tab and
        // segment labels (on an 8–14% accent tint over the page), the
        // answered exam-navigator cell and the velocity badge (10–15% over a
        // card), the wordmark and accent icons. Plain --accent fails as text
        // in every theme on those tints.
        it(`${name}: accent text reads on the page, cards and accent tints`, () => {
            const fg = resolve(t, t['--accent-text']);
            const accent = resolve(t, t['--accent']);
            const page = resolve(t, t['--bg-primary']);
            const card = resolve(t, t['--bg-surface']);
            const failures = [
                ['page', page], ['card', card],
                ['15% accent tint on the page', mix(accent, page, 0.15)],
                ['15% accent tint on a card', mix(accent, card, 0.15)],
            ]
                .map(([on, bg]) => ({ on, ratio: +contrast(fg, bg).toFixed(2) }))
                .filter((r) => r.ratio < 4.5);
            expect(failures).toEqual([]);
        });

        // WCAG 1.4.11: a focus indicator is a non-text graphic, 3:1 against
        // what it sits on.
        it(`${name}: the focus ring clears 3:1 on the page, cards and panels`, () => {
            const ring = resolve(t, t['--focus-ring-color']);
            const failures = ['--bg-primary', '--bg-surface', '--bg-surface2']
                .map((bg) => ({ bg, ratio: +contrast(ring, resolve(t, t[bg])).toFixed(2) }))
                .filter((r) => r.ratio < 3);
            expect(failures).toEqual([]);
        });
    }

    // The brand hues are used as text in ~80 places (text-reeCyan, text-signal,
    // text-reeAmber…). The stock values read at 1.5–3.8:1 on the near-white
    // surfaces, so the light themes carry darker shades. The dark themes keep
    // the stock values, which white-on-colour buttons need; their text uses
    // move to dedicated text tokens in a later pass.
    const BRAND_TEXT = ['--brand-blue', '--brand-cyan', '--brand-amber', '--brand-green', '--brand-red', '--brand-purple', '--accent-signal'];
    for (const name of ['light', 'paper', 'sakura']) {
        it(`${name}: brand colours used as text clear the floor`, () => {
            const t = all[name];
            const failures = BRAND_TEXT.flatMap((fg) => SURFACES.map((bg) => {
                const min = bg === '--bg-surface3' ? 3 : 4.5;
                return { pair: `${fg} on ${bg}`, ratio: +contrast(resolve(t, t[fg]), resolve(t, t[bg])).toFixed(2), min };
            })).filter((r) => r.ratio < r.min);
            expect(failures).toEqual([]);
        });
    }
});
