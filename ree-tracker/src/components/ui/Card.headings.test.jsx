import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { Card, CardHeader, CardTitle } from './Card';

// Lighthouse gates accessibility at >= 0.95 and heading-order is part of that
// score, but CI can only reach the auth-gated login page — so the Dashboard
// violation this fixes (h1 "Readiness overview" straight to h3 "Daily targets")
// is invisible to the pipeline. These tests stand in for it.

describe('CardTitle sits one level below a page h1', () => {
    it('renders an h2', () => {
        render(<Card><CardHeader><CardTitle>Daily targets</CardTitle></CardHeader></Card>);
        const heading = screen.getByRole('heading', { name: 'Daily targets' });
        expect(heading.tagName).toBe('H2');
    });

    it('still forwards className and props', () => {
        render(<CardTitle className="custom" data-testid="t">Title</CardTitle>);
        const el = screen.getByTestId('t');
        expect(el.className).toContain('custom');
        expect(el.className).toContain('text-textMain');   // base classes kept
    });
});

describe('no card-level heading skips a level', () => {
    // Changing CardTitle to h2 without also lifting these would have created
    // fresh h2 -> h4 skips on Profile, Arena and LibraryOverview — trading one
    // violation for three. This asserts the second half of that change stuck.
    // Scans raw source text, comments included. That is deliberate: it is a
    // conservative check with a trivial fix (write "h4" rather than the tag in
    // prose), and the alternative — parsing out comments — is more machinery
    // than a heading guard is worth.
    const SRC = path.join(process.cwd(), 'src');

    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return walk(p);
        return e.name.endsWith('.jsx') && !e.name.includes('.test.') ? [p] : [];
    });

    it('no component renders an h4 element', () => {
        const offenders = walk(SRC)
            .filter((f) => /<h4[\s>]/.test(fs.readFileSync(f, 'utf8')))
            .map((f) => path.relative(SRC, f));
        expect(offenders).toEqual([]);
    });

    it('no component renders an h5 or h6 either', () => {
        const offenders = walk(SRC)
            .filter((f) => /<h[56][\s>]/.test(fs.readFileSync(f, 'utf8')))
            .map((f) => path.relative(SRC, f));
        expect(offenders).toEqual([]);
    });
});
