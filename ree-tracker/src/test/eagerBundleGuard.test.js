import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// The guard's whole value rests on eagerAssets() correctly reading a built
// index.html. If Vite changes that markup and the parser silently matches
// nothing, the guard reports 0 bytes and "passes" forever — the same silent
// failure mode the secret scanner has. These fixtures pin the shapes.
const require = createRequire(import.meta.url);
const { eagerAssets, BUDGET_BYTES } = require('../../scripts/check-eager-bundle.cjs');

const BUILT = `<!DOCTYPE html><html><head>
<link rel="modulepreload" crossorigin href="/assets/react-DKES9T7x.js">
<link rel="modulepreload" crossorigin href="/assets/firebase-DRALefAY.js">
<link rel="stylesheet" crossorigin href="/assets/index-O4AzRAzs.css">
<script type="module" crossorigin src="/assets/index-BueCXvwO.js"></script>
</head><body><div id="root"></div></body></html>`;

describe('eagerAssets parses a built index.html', () => {
    it('finds the entry script and every preload and stylesheet', () => {
        expect(eagerAssets(BUILT).sort()).toEqual([
            'firebase-DRALefAY.js',
            'index-BueCXvwO.js',
            'index-O4AzRAzs.css',
            'react-DKES9T7x.js',
        ]);
    });

    it('counts each asset once even when linked twice', () => {
        const twice = BUILT.replace('</head>',
            '<link rel="modulepreload" href="/assets/react-DKES9T7x.js"></head>');
        expect(eagerAssets(twice).filter((a) => a === 'react-DKES9T7x.js')).toHaveLength(1);
    });

    it('ignores lazy chunks, which are the whole point of the budget', () => {
        // An async chunk is referenced from JS, never linked in the HTML head.
        // If one ever showed up here the budget would punish correct laziness.
        expect(eagerAssets(BUILT)).not.toContain('Dashboard-BBUEP1A6.js');
    });

    it('ignores non-asset links such as icons and the manifest', () => {
        const withIcons = BUILT.replace('</head>',
            '<link rel="icon" href="/favicon.svg">'
            + '<link rel="manifest" href="/manifest.webmanifest"></head>');
        expect(eagerAssets(withIcons).sort()).toEqual(eagerAssets(BUILT).sort());
    });

    it('returns nothing for markup it cannot read, so the CLI can fail loudly', () => {
        // The guard treats an empty list as an error rather than a pass. This
        // pins that there IS an empty case to detect.
        expect(eagerAssets('<html><head></head></html>')).toEqual([]);
    });
});

describe('the budget keeps its stated safety property', () => {
    it('leaves less headroom than the smallest regression it must catch', () => {
        const MEASURED = 611_139;      // payload when this guard was written
        const SMALLEST_OFFENDER = 117_000;  // `charts`, PR #94
        expect(BUDGET_BYTES - MEASURED).toBeLessThan(SMALLEST_OFFENDER);
        expect(BUDGET_BYTES).toBeGreaterThan(MEASURED);   // and not already failing
    });
});
