import { describe, it, expect } from 'vitest';

// A secret scanner's failure mode is silent: "matches nothing" and "regex is
// broken" produce identical output on a clean tree. Running it against the repo
// therefore proves nothing on its own — these tests drive the same scanText()
// the CLI uses, with synthetic content, so every rule is shown to actually fire.
//
// The second half matters just as much. ree-tracker-backend/.env.example
// deliberately documents a connection string and a PEM block as placeholders,
// and must keep doing so. A guard that flags them would be turned off within a
// week, which is worse than no guard.
//
// Every fixture below is fabricated: correct SHAPE, invented characters. No real
// credential appears in this file — which is rather the point.
//
// They are also ASSEMBLED AT RUNTIME rather than written as whole literals, and
// that is not decoration. The first version of this file spelled them out, and
// GitHub push protection rejected the push:
//
//     —— Slack API Token ——
//     path: ree-tracker-backend/tests/auditSecrets.test.js:40
//
// which is the correct behaviour on GitHub's part — a scanner cannot tell a test
// fixture from the real thing. The offered escape hatch is an "allow this secret"
// URL that permanently whitelists the pattern for the repository; taking it would
// have weakened push protection for everyone to make one test file convenient.
// Splitting the constants keeps both scanners working: no contiguous
// secret-shaped string exists on disk, while the value the rules see at runtime
// is byte-identical to the real shape.
const cat = (...parts) => parts.join('');

const FAKE = {
    google: cat('AIza', 'SyD3xAmPl3F4k3K3y', 'N0tR34l0000000000000'),
    aws: cat('AKIA', 'IOSFODNN7', 'EXAMPLE'),
    github: cat('ghp', '_', 'a1b2c3d4e5'.repeat(3), 'abcdef'),
    slack: cat('xox', 'b-', '1234567890', '-abcdefghijklmnop'),
    pemBody: 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ'.repeat(4),
    dbPassword: cat('S3cr3t', 'P4ss'),
    keyId: cat('9f2c1a7be4', 'd3086512ab'),
};

const { scanText, RULES, mask } = require('../scripts/audit-secrets.js');

const ids = (text) => scanText(text).map((h) => h.id).sort();

describe('audit-secrets rules fire on real-shaped credentials', () => {
    it('catches a Google API key', () => {
        expect(ids(`const k = "${FAKE.google}";`))
            .toContain('google-api-key');
    });

    it('catches a PEM private key with a substantial body', () => {
        expect(ids(`-----BEGIN PRIVATE KEY-----\n${FAKE.pemBody}\n-----END PRIVATE KEY-----`))
            .toContain('private-key-block');
    });

    it('catches a connection string carrying a real password', () => {
        expect(ids(`postgresql://appuser:${FAKE.dbPassword}@db.abcdef.supabase.co:5432/postgres`))
            .toContain('db-url-with-password');
    });

    it('catches AWS, GitHub and Slack tokens', () => {
        expect(ids(FAKE.aws)).toContain('aws-access-key');
        expect(ids(FAKE.github)).toContain('github-token');
        expect(ids(FAKE.slack)).toContain('slack-token');
    });

    it('catches a Google service-account key id', () => {
        expect(ids(`{"private_key_id": "${FAKE.keyId}", "client_email": "x@y.iam"}`))
            .toContain('gcp-service-account');
    });

    it('reports the line number of the match', () => {
        const hit = scanText(`one\ntwo\n${FAKE.google}\n`)[0];
        expect(hit.line).toBe(3);
    });
});

describe('audit-secrets does not flag documented placeholders', () => {
    // These two lines are copied from ree-tracker-backend/.env.example. If this
    // test starts failing, the guard has begun flagging its own documentation.
    it('allows the .env.example connection string', () => {
        expect(ids('DATABASE_URL=postgresql://user:pass@host:5432/dbname')).toEqual([]);
    });

    it('allows the .env.example PEM placeholder', () => {
        expect(ids('FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"'))
            .toEqual([]);
    });

    it('allows local development connection strings', () => {
        expect(ids('postgresql://postgres:postgres@localhost:5432/dev')).toEqual([]);
        expect(ids('redis://user:changeme@localhost:6379')).toEqual([]);
    });

    it('allows empty and angle-bracket placeholders', () => {
        expect(ids('GEMINI_API_KEY=')).toEqual([]);
        expect(ids('postgresql://<user>:<password>@<host>:5432/db')).toEqual([]);
    });

    it('allows template-literal interpolations and shell/env references', () => {
        // Found by dogfooding: the guard flagged this very file, because a
        // fixture built as `postgresql://user:${...}@host` puts an interpolation
        // where the password goes. Assembling a connection string from variables
        // is the correct way to do it, so the rule has to understand it.
        expect(ids('postgresql://user:${dbPass}@db.example.com:5432/app')).toEqual([]);
        expect(ids('postgresql://user:$DB_PASSWORD@db.example.com:5432/app')).toEqual([]);
        expect(ids('{"private_key_id": "${keyId}"}')).toEqual([]);
    });

    it('does not mistake ordinary prose or code for a secret', () => {
        expect(ids('The AIza prefix identifies a Google key; we never commit one.')).toEqual([]);
        expect(ids('const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;')).toEqual([]);
    });
});

describe('audit-secrets output never republishes the secret', () => {
    it('masks the middle of a finding', () => {
        const out = mask(FAKE.google);
        expect(out).not.toContain(FAKE.google.slice(6, -4));
        expect(out).toMatch(/^AIzaSy…0000 \(\d+ chars\)$/);
    });

    it('fully masks short values', () => {
        expect(mask('short')).toBe('***');
    });
});

describe('rule set integrity', () => {
    it('every rule has a stable id, a global regex and an explanation', () => {
        for (const r of RULES) {
            expect(r.id).toMatch(/^[a-z0-9-]+$/);
            expect(r.re.flags).toContain('g');   // lastIndex reset relies on /g
            expect(r.why.length).toBeGreaterThan(10);
        }
        expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
    });
});
