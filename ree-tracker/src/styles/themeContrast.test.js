// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { CALENDAR_LEVELS } from '../features/profile/calendarLevels';

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
//              (QuestionCard's answered-option row), ≥ 3:1 on the chip layer;
//   inks       (--on-accent/-danger/-success/-amber/-signal) ≥ 4.5:1 on their
//              tone's button fill, the tone mixed 88% toward black.

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

// Tailwind's @theme tokens (--color-reeAmber…), which every theme shares.
const THEME_TOKENS = Object.fromEntries(
    [...(css.match(/@theme\s*\{([^}]*)\}/)?.[1] ?? '').matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()]),
);

// A token's colour as the browser computes it: follows var() (with its
// fallback) and color-mix(in srgb, A n%, B), so --accent-text and
// --focus-ring-color are checked as rendered, not skipped as non-hex.
function resolve(t, value) {
    const v = String(value ?? '').trim();
    const ref = v.match(/^var\((--[a-zA-Z0-9-]+)(?:,\s*(.+))?\)$/);
    if (ref) return resolve(t, t[ref[1]] ?? THEME_TOKENS[ref[1]] ?? ref[2]);
    const m = v.match(/^color-mix\(in srgb,\s*(.+?)\s+(\d+)%,\s*(.+)\)$/);
    if (m) return mix(resolve(t, m[1]), resolve(t, m[3]), Number(m[2]) / 100);
    if (v === 'black') return '#000000';
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    throw new Error(`unresolvable colour: ${value}`);
}

// A filled control: the tone mixed 88% toward black, as Button's `primary`
// renders it (bg-[color-mix(in_srgb,var(--btn-accent)_88%,black)]). The
// exam banner, the current exam-navigator cell, the planner's selected day
// and the Scratchpad's Close use the same fill.
const fill = (t, tone) => resolve(t, `color-mix(in srgb, ${tone} 88%, black)`);

// Button's tone → colour and tone → ink maps, read from its source, so a tone
// added there is measured here too.
const buttonSrc = fs.readFileSync(new URL('../components/ui/Button.jsx', import.meta.url), 'utf8');
function toneMap(name) {
    const body = buttonSrc.match(new RegExp(`const ${name} = \\{([\\s\\S]*?)\\};`))?.[1] ?? '';
    return Object.fromEntries([...body.matchAll(/(\w+):\s*'(var\([^']+\))'/g)].map((m) => [m[1], m[2]]));
}
const TONE_VAR = toneMap('TONE_VAR');
const TONE_INK = toneMap('TONE_INK');
const TONE_TEXT = toneMap('TONE_TEXT');

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

        // The signal cyan as text: the signal badge (subjects in the Notebook
        // and Bookmarks) and the question's subject chip, on a 10–15% signal
        // tint over the page or a card. The stock cyan read 3.8–4.4:1 on the
        // forest, ocean and math cards (axe).
        it(`${name}: the signal colour reads as a badge on its own tint`, () => {
            const fg = resolve(t, t['--accent-signal']);
            const failures = ['--bg-primary', '--bg-surface'].flatMap((bg) => {
                const under = resolve(t, t[bg]);
                return [[bg, under], [`15% tint on ${bg}`, mix(fg, under, 0.15)]];
            })
                .map(([on, bg]) => ({ on, ratio: +contrast(fg, bg).toFixed(2) }))
                .filter((r) => r.ratio < 4.5);
            expect(failures).toEqual([]);
        });

        // A status pill or badge is the same 12% tint, over the page as often
        // as a card. On light and paper, whose page is darker than their cards,
        // "Hotkeys on" read 4.46:1 (axe, a running Practice session).
        it(`${name}: a status pill's label reads on its own tint over the page`, () => {
            const failures = ['--accent-success', '--accent-danger']
                .map((token) => ({ token, ratio: +contrast(t[token], tint(t[token], t['--bg-primary'])).toFixed(2) }))
                .filter((r) => r.ratio < 4.5);
            expect(failures).toEqual([]);
        });

        // --accent-text is every foreground use of the accent: active tab and
        // segment labels (on an 8–14% accent tint over the page), the
        // answered exam-navigator cell and the velocity badge (10–15% over a
        // card), the wordmark and accent icons, and accent labels on the
        // --bg-surface2 panels (the solution and AI explanation panels sit
        // between a card and that). Plain --accent fails as text in every
        // theme on those tints.
        it(`${name}: accent text reads on the page, cards, panels and accent tints`, () => {
            const fg = resolve(t, t['--accent-text']);
            const accent = resolve(t, t['--accent']);
            const page = resolve(t, t['--bg-primary']);
            const card = resolve(t, t['--bg-surface']);
            const failures = [
                ['page', page], ['card', card], ['panel', resolve(t, t['--bg-surface2'])],
                ['15% accent tint on the page', mix(accent, page, 0.15)],
                ['15% accent tint on a card', mix(accent, card, 0.15)],
            ]
                .map(([on, bg]) => ({ on, ratio: +contrast(fg, bg).toFixed(2) }))
                .filter((r) => r.ratio < 4.5);
            expect(failures).toEqual([]);
        });

        // The mark's letterforms (components/ui/Logo.jsx) are a graphic that
        // identifies the app: 3:1 against the page and cards it sits on.
        it(`${name}: the logo's ink clears 3:1 on the page and cards`, () => {
            const ink = resolve(t, t['--logo-ink'] ?? THEME_TOKENS['--logo-ink']);
            const failures = ['--bg-primary', '--bg-surface']
                .map((bg) => ({ bg, ratio: +contrast(ink, resolve(t, t[bg])).toFixed(2) }))
                .filter((r) => r.ratio < 3);
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

        // Labels on filled buttons are body-size text: 4.5:1. White on the
        // dark themes' green, amber, cyan and pink fills read at 1.9–4.07:1
        // (about 35 call sites), so each tone has an ink token.
        it(`${name}: every button tone's ink reads on its fill`, () => {
            const failures = Object.entries(TONE_VAR)
                .map(([tone, colour]) => ({ tone, ratio: +contrast(resolve(t, TONE_INK[tone]), fill(t, colour)).toFixed(2) }))
                .filter((r) => r.ratio < 4.5);
            expect(failures).toEqual([]);
        });

        // Outline and toned ghost buttons put the tone on the page or a card
        // as their label. The raw accent read 4.07:1 there.
        it(`${name}: every button tone's label reads on the page and cards`, () => {
            const failures = Object.entries(TONE_TEXT).flatMap(([tone, colour]) => ['--bg-primary', '--bg-surface']
                .map((bg) => ({ tone, bg, ratio: +contrast(resolve(t, colour), resolve(t, t[bg])).toFixed(2) })))
                .filter((r) => r.ratio < 4.5);
            expect(failures).toEqual([]);
        });

        // The same fills outside Button, which take the accent from --accent
        // rather than --accent-velocity: the current exam-navigator cell and
        // the planner's selected day.
        it(`${name}: the accent ink reads on a raw --accent fill`, () => {
            expect(+contrast(resolve(t, t['--on-accent']), fill(t, 'var(--accent)')).toFixed(2)).toBeGreaterThanOrEqual(4.5);
        });

        // The study calendar: each level is the success fill mixed into the
        // card, with the day number and count in that level's ink.
        it(`${name}: the study calendar's day numbers read on every level`, () => {
            const card = resolve(t, t['--bg-surface']);
            const failures = CALENDAR_LEVELS
                .map(({ share, ink }) => ({ share, ratio: +contrast(resolve(t, ink), mix(fill(t, 'var(--accent-success)'), card, share / 100)).toFixed(2) }))
                .filter((r) => r.ratio < 4.5);
            expect(failures).toEqual([]);
        });
    }

    it('measures every Button tone, each with an ink and a label colour', () => {
        expect(Object.keys(TONE_VAR).sort()).toEqual(['accent', 'amber', 'danger', 'signal', 'success']);
        expect(Object.keys(TONE_INK).sort()).toEqual(Object.keys(TONE_VAR).sort());
        expect(Object.keys(TONE_TEXT).sort()).toEqual(Object.keys(TONE_VAR).sort());
    });

    // The brand hues are used as text in ~80 places (text-reeCyan, text-signal,
    // text-reeAmber…). The stock values read at 1.5–3.8:1 on the near-white
    // surfaces, so the light themes carry darker shades. The dark themes keep
    // the stock values, which white-on-colour buttons need; their text uses
    // move to dedicated text tokens in a later pass.
    const BRAND_TEXT = ['--brand-blue', '--brand-cyan', '--brand-amber', '--brand-green', '--brand-red', '--brand-purple', '--accent-signal'];
    const BRAND_DEFAULTS = { red: '#ef4444', purple: '#8b5cf6', green: '#22c55e', amber: '#f59e0b', cyan: '#06b6d4', blue: '#3b82f6' };

    // What text-ree*-text renders: the theme's --brand-*-text, else its brand
    // colour, else the @theme default (the same fallback chain as index.css).
    // Text sits on the page and on cards (4.5:1); chips and panels hold short
    // bold labels and icons (3:1).
    for (const [name, t] of Object.entries(all)) {
        it(`${name}: brand colours as text read on every surface`, () => {
            const failures = Object.entries(BRAND_DEFAULTS).flatMap(([hue, fallback]) => {
                const fg = resolve(t, `var(--brand-${hue}-text, var(--brand-${hue}, ${fallback}))`);
                return SURFACES.map((bg, i) => {
                    const min = i < 2 ? 4.5 : 3;
                    return { pair: `${hue} text on ${bg}`, ratio: +contrast(fg, resolve(t, t[bg])).toFixed(2), min };
                });
            }).filter((r) => r.ratio < r.min);
            expect(failures).toEqual([]);
        });
    }
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

// Page textures (index.css, PAGE TEXTURES): the default in `body {…}` and
// each theme's own `[data-theme="x"] body {…}`. Text sits straight on the
// page in headers, tab rows and between cards, so it must still read where
// the texture is strongest: under the glow's peak (every glow at its peak at
// once), on a line of the pattern, and both together.
describe('page textures', () => {
    const all = themes();
    const decls = (body) => Object.fromEntries([...body.matchAll(/(--texture-[a-z]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()]));
    const base = decls(css.match(/(?:^|\n)body\s*\{([^}]*--texture-[^}]*)\}/)?.[1] ?? '');
    const own = Object.fromEntries([...css.matchAll(/\[data-theme="([a-z]+)"\] body\s*\{([^}]*)\}/g)].map((m) => [m[1], decls(m[2])]));
    const texture = (name) => ({ ...base, ...(own[name] || {}) });
    const publicDir = new URL('../../public/', import.meta.url);

    it('every theme has a texture of its own', () => {
        expect(base['--texture-mask']).toBeTruthy();
        expect(Object.keys(own).sort()).toEqual(Object.keys(all).filter((n) => n !== 'default').sort());
        for (const [name, t] of Object.entries(own)) expect(t['--texture-mask'], name).toBeTruthy();
    });

    it('every tile is a small, inert SVG that the stylesheet uses', () => {
        const used = new Set([...css.matchAll(/url\("\/textures\/([a-z-]+\.svg)"\)/g)].map((m) => m[1]));
        const files = fs.readdirSync(new URL('textures/', publicDir));
        expect([...used].sort()).toEqual(files.sort());
        for (const file of files) {
            const svg = fs.readFileSync(new URL(`textures/${file}`, publicDir), 'utf8');
            expect(svg.length, file).toBeLessThan(4096);
            expect(svg, file).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
            expect(svg, file).not.toMatch(/<script|<foreignObject|href=|url\((?!#)/i);
        }
    });

    for (const name of Object.keys(all)) {
        it(`${name}: text on the page reads over the texture`, () => {
            const t = all[name];
            const x = texture(name);
            const page = resolve(t, t['--bg-primary']);
            // Each glow sits in its own corner, so they are taken one at a time.
            const glows = [...(x['--texture-glow'] || '').matchAll(/color-mix\(in srgb, (.+?) (\d+)%, transparent\)/g)]
                .map((m) => mix(resolve(t, m[1]), page, Number(m[2]) / 100));
            const ink = resolve(t, x['--texture-ink']);
            const opacity = Number(x['--texture-opacity']);
            expect(opacity, 'opacity').toBeGreaterThanOrEqual(0);
            expect(opacity, 'opacity').toBeLessThanOrEqual(0.5);
            const grounds = [page, ...glows].flatMap((g) => [g, mix(ink, g, opacity)]);
            const failures = [
                ['--text-main', 4.5], ['--text-muted', 4.5], ['--text-muted2', 4.5], ['--accent-text', 4.5], ['--focus-ring-color', 3],
            ].flatMap(([fg, min]) => grounds.map((bg) => ({ fg, bg, ratio: +contrast(resolve(t, t[fg]), bg).toFixed(2), min })))
                .filter((r) => r.ratio < r.min);
            expect(failures).toEqual([]);
        });
    }
});
