#!/usr/bin/env node
'use strict';

// Standing check: fail the build if a credential is committed.
//
// This exists because it already happened. `ree-tracker/.env` — carrying a real
// VITE_GEMINI_API_KEY — was committed in fcc7b24, on a commit whose own message
// read "Initial commit of monorepo safely ignoring secret", and
// android/app/google-services.json followed in ec1d463. Both are gitignored and
// untracked now, and the Gemini key has been rotated, but nothing stopped it
// happening and nothing would stop the next one. This converts "found once"
// into "cannot regress silently", the same way the SQL and route-auth guards do.
//
// SCOPE: every file git TRACKS, across both workspaces and CI config — not just
// backend src/. A secret can land anywhere, and enumerating via `git ls-files`
// means .gitignore is honoured for free: a file that is properly ignored is
// invisible here, which is exactly right.
//
// PLACEHOLDERS ARE NOT SECRETS. .env.example deliberately documents
//   DATABASE_URL=postgresql://user:pass@host:5432/dbname
//   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
// and must keep doing so. Each rule below therefore decides, not just matches.
// Blanket-skipping example files was the alternative and is worse: a real value
// pasted into one would then sail through.
//
// NOT COVERED, deliberately: this reads the working tree, not history. It stops
// the next leak; it cannot unpublish an old one. Only rotation does that.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..', '..');
const SELF = 'ree-tracker-backend/scripts/audit-secrets.js';

// Files exempt with a stated reason. Keep this list short and justified — an
// entry here is a decision that a match is safe, not a way to silence noise.
const ALLOW = {
    // (none today — add as: 'path/to/file': 'why this match is not a secret')
};

const MAX_BYTES = 1024 * 1024;   // skip anything larger; secrets are not in 1MB blobs
const SKIP_DIRS = /(^|\/)(node_modules|dist|build|\.git|android\/app\/build)\//;
const SKIP_EXT = /\.(png|jpg|jpeg|gif|webp|ico|svg|woff2?|ttf|eot|pdf|zip|jar|keystore|jks|mp4|webm)$/i;
const LOCKFILES = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/;

// Obvious documentation stand-ins, not credentials.
//
// `${...}` is in here because the guard flagged its OWN test file on first run:
// a fixture built as `postgresql://user:${FAKE.dbPassword}@host` is a template
// literal, and the interpolation is code, not a value. Any codebase that
// assembles a connection string from variables — which is the correct way to do
// it — would hit the same false positive, so this is fixed in the rule rather
// than allowlisted away.
const PLACEHOLDER = /^(?:|\.{3}|x{3,}|<[^>]*>|\$\{[^}]*\}|\$[A-Z_]+|%[A-Za-z_]+%|your[_-]?\w*|change[_-]?me|pass(?:word)?|secret|token|key|dbname|host|user(?:name)?|example|placeholder|todo|dummy|test|fake|redacted|\*+)$/i;

const RULES = [
    {
        id: 'google-api-key',
        // 39 chars total. No plausible placeholder has this exact shape, so a
        // match is a match — including the Firebase web key, which is public by
        // design but still has no business being hardcoded rather than read
        // from import.meta.env.
        re: /AIza[0-9A-Za-z_-]{35}/g,
        verdict: () => true,
        why: 'Google API key (Gemini / Firebase / Maps). Read it from an env var instead.',
    },
    {
        id: 'private-key-block',
        re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----([\s\S]{0,4000}?)-----END/g,
        // A real key carries hundreds of base64 chars. The .env.example body is
        // literally `\n...\n`, so measure the body rather than trusting the file.
        verdict: (m) => (m[1] || '').replace(/[\s\\n"']/g, '').length > 100,
        why: 'PEM private key body. Store it in a secret manager, never in the repo.',
    },
    {
        id: 'db-url-with-password',
        re: /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/([^:@\/\s"']+):([^@\/\s"']+)@([^\/\s"':]+)/g,
        verdict: (m) => !PLACEHOLDER.test(m[2]) && !PLACEHOLDER.test(m[3])
            && !/^(localhost|127\.0\.0\.1|db|database)$/i.test(m[3]),
        why: 'Connection string with an embedded password.',
    },
    { id: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/g, verdict: () => true,
      why: 'AWS access key id.' },
    { id: 'github-token', re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{22,}/g,
      verdict: () => true, why: 'GitHub personal access token.' },
    { id: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, verdict: () => true,
      why: 'Slack token.' },
    {
        id: 'gcp-service-account',
        re: /"private_key_id"\s*:\s*"([^"]{8,})"/g,
        verdict: (m) => !PLACEHOLDER.test(m[1]),
        why: 'Google service-account JSON. Provide it as an env var or mounted secret.',
    },
];

function tracked() {
    return execFileSync('git', ['ls-files', '-z'], { cwd: REPO, maxBuffer: 64 * 1024 * 1024 })
        .toString('utf8').split('\0').filter(Boolean);
}

/** Mask a finding so the guard's own output never republishes the secret. */
function mask(s) {
    const t = String(s);
    return t.length <= 12 ? '***' : `${t.slice(0, 6)}…${t.slice(-4)} (${t.length} chars)`;
}

/**
 * Apply every rule to one blob of text. Split out from the file walk so the
 * rules can be tested against synthetic content — a secret scanner that is only
 * ever run against a clean tree proves nothing, since "matches nothing" and
 * "broken" look identical from the outside.
 */
function scanText(text) {
    const hits = [];
    for (const rule of RULES) {
        rule.re.lastIndex = 0;
        let m;
        while ((m = rule.re.exec(text)) !== null) {
            if (!rule.verdict(m)) continue;
            hits.push({
                id: rule.id,
                line: text.slice(0, m.index).split('\n').length,
                sample: m[2] || m[1] || m[0],
            });
        }
    }
    return hits;
}

if (require.main !== module) {
    module.exports = { RULES, scanText, mask, PLACEHOLDER };
    return;
}

const findings = [];

for (const rel of tracked()) {
    if (rel === SELF || rel in ALLOW) continue;
    if (SKIP_DIRS.test(rel) || SKIP_EXT.test(rel) || LOCKFILES.test(rel)) continue;

    const abs = path.join(REPO, rel);
    let st;
    try { st = fs.statSync(abs); } catch { continue; }   // deleted-but-tracked
    if (!st.isFile() || st.size > MAX_BYTES) continue;

    const buf = fs.readFileSync(abs);
    if (buf.includes(0)) continue;                        // binary
    const text = buf.toString('utf8');

    // Same function the tests drive, so what is verified is what runs.
    for (const hit of scanText(text)) findings.push({ rel, ...hit });
}

if (findings.length === 0) {
    console.log('✓ Secret scan passed — no credentials found in tracked files.');
    process.exit(0);
}

console.error(`\n✗ Secret scan FAILED — ${findings.length} potential credential(s) committed:\n`);
const WHY = Object.fromEntries(RULES.map((r) => [r.id, r.why]));
for (const f of findings) {
    console.error(`  ${f.rel}:${f.line}`);
    console.error(`    ${f.id}: ${mask(f.sample)}`);
    console.error(`    ${WHY[f.id]}\n`);
}
console.error('  A committed secret must be ROTATED, not just deleted: removing the file');
console.error('  (or rewriting history) does not unpublish it. Rotate first, then remove');
console.error('  the value, add the path to .gitignore, and re-run.\n');
console.error(`  If a match is genuinely not a secret, add it to ALLOW in ${SELF}`);
console.error('  with a one-line reason.\n');
process.exit(1);
