#!/usr/bin/env node
'use strict';

// Standing check (Phase 0 gate), in two parts.
//
// PART 1 — AUTHENTICATION: every API route must be behind authentication unless
// explicitly allow-listed as public.
//
// PART 2 — AUTHORIZATION: every route that WRITES to a resource named by a path
// parameter must also prove it cannot be pointed at someone else's row.
//
// Part 2 exists because Part 1 alone was green while four real holes were live:
// POST /api/questions wrote the shared live question bank for any authenticated
// user, PUT /:id/cache overwrote any question's global explanation, PATCH
// /:id/flag removed any question from every pool for everyone, and the telemetry
// path upserted an ExamSession keyed on a client-supplied id with no owner in
// the predicate. `hasAuthToken` answered "is any authed user allowed?", which is
// the wrong question — so the check passed precisely because it could not see
// the bug class.
//
// Recognized ways a route is protected:
//   1. per-handler middleware:  router.post('/x', authMiddleware, handler)
//   2. multi-line registration with the middleware on a later line
//   3. router-level guard:       router.use(authMiddleware, adminMiddleware)
//
// Note: app.use('/api', requireFirebase, requireDb) in server.js is a readiness
// gate (Firebase configured / DB up), NOT identity — it does not count as auth.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROUTES_DIR = path.join(ROOT, 'src', 'routes');

// Intentionally-public routes. Key = "<file basename> <METHOD> <path>".
const PUBLIC_ALLOWLIST = new Set([
  'configRoutes.js GET /tos', // public Terms-of-Service text, shown pre-login
]);

// Parameterized writes that are deliberately NOT owner-scoped. Every entry needs
// a reason — if you cannot write one, the route is probably the bug.
const SHARED_WRITE_ALLOWLIST = new Map([
  ['questionRoutes.js PATCH /:id/flag',
    'Deliberately open: any user may report an anomaly. The write goes to a '
    + 'per-user QuestionFlag row (unique on questionId+userId); the shared '
    + 'Question.isFlagged bit flips only at FLAG_THRESHOLD distinct reporters '
    + 'or on an admin flag, so one account cannot quarantine the bank.'],
]);

// Middleware names that constitute authentication.
const AUTH_TOKENS = ['authMiddleware', 'adminMiddleware', 'requireAdmin', 'requireSelf', 'roleMiddleware'];
const hasAuthToken = (s) => AUTH_TOKENS.some((t) => s.includes(t));

// Middleware names that constitute AUTHORIZATION (a real ownership/role gate).
// authMiddleware is absent on purpose: it proves identity, not entitlement.
const AUTHZ_TOKENS = ['adminMiddleware', 'requireAdmin', 'requireSelf'];
const hasAuthzToken = (s) => AUTHZ_TOKENS.some((t) => s.includes(t));

// Heuristic proof that a handler scopes its query to the caller. Matches the
// established pattern in bookmarkRoutes / plannerRoutes / examRoutes:
//   where: { id: req.params.id, userId: req.user.id }
// It is a guard, not a proof — a handler can still get this wrong in ways a
// regex cannot see. It catches the omission, which is the common failure.
const OWNER_SCOPED_RE = /userId:\s*req\.user\.id/;

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const REG = /router\.(get|post|put|delete|patch|all)\s*\(/g;
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

function routeFiles() {
  return fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.js')).map((f) => path.join(ROUTES_DIR, f));
}

const authViolations = [];
const authzViolations = [];

for (const file of routeFiles()) {
  const base = path.basename(file);
  const src = fs.readFileSync(file, 'utf8');

  // Router-level guards protect every route in the file.
  let routerAuthed = false;
  let routerAuthz = false;
  const useRe = /router\.use\s*\(([^)]*)\)/g;
  let u;
  while ((u = useRe.exec(src)) !== null) {
    if (hasAuthToken(u[1])) routerAuthed = true;
    if (hasAuthzToken(u[1])) routerAuthz = true;
  }

  REG.lastIndex = 0;
  let m;
  while ((m = REG.exec(src)) !== null) {
    const method = m[1].toUpperCase();
    const start = m.index + m[0].length;

    // Bound the argument span to the earliest of: the handler signature '(req',
    // the next router registration, or a fixed window — so we never bleed into
    // the following route and misattribute its middleware.
    const bounds = [start + 800];
    const handlerIdx = src.indexOf('(req', start);
    if (handlerIdx !== -1) bounds.push(handlerIdx);
    const nextReg = src.indexOf('router.', start);
    if (nextReg !== -1) bounds.push(nextReg);
    const argsSpan = src.slice(start, Math.min(...bounds));

    const pathMatch = argsSpan.match(/['"`]([^'"`]*)['"`]/);
    const routePath = pathMatch ? pathMatch[1] : '<unknown>';
    const key = `${base} ${method} ${routePath}`;

    // ── Part 1: authentication ──────────────────────────────────────────────
    if (!(routerAuthed || hasAuthToken(argsSpan) || PUBLIC_ALLOWLIST.has(key))) {
      authViolations.push({ file: `src/routes/${base}`, line: lineOf(src, m.index), key });
      continue; // no point checking authorization on an unauthenticated route
    }

    // ── Part 2: authorization on parameterized writes ───────────────────────
    if (!WRITE_METHODS.has(method) || !routePath.includes(':')) continue;
    if (routerAuthz || hasAuthzToken(argsSpan) || SHARED_WRITE_ALLOWLIST.has(key)) continue;

    // Body of this handler: from the registration to the next one (or EOF).
    const bodyEnd = nextReg !== -1 ? nextReg : src.length;
    const body = src.slice(start, bodyEnd);
    if (OWNER_SCOPED_RE.test(body)) continue;

    authzViolations.push({ file: `src/routes/${base}`, line: lineOf(src, m.index), key });
  }
}

let failed = false;

if (authViolations.length > 0) {
  failed = true;
  console.error('\n✖ Route auth-coverage check FAILED — these routes have no authentication:');
  for (const v of authViolations) console.error(`  ${v.file}:${v.line}  ${v.key}`);
  console.error('\n  Add authMiddleware (or an admin/self guard), or, if the route is intentionally');
  console.error('  public, add its "<file> <METHOD> <path>" key to PUBLIC_ALLOWLIST in this script.\n');
}

if (authzViolations.length > 0) {
  failed = true;
  console.error('\n✖ Route AUTHORIZATION check FAILED — these routes write to a resource named by a');
  console.error('  path parameter, but nothing stops one user from passing another user\'s id:');
  for (const v of authzViolations) console.error(`  ${v.file}:${v.line}  ${v.key}`);
  console.error('\n  Fix by one of:');
  console.error('    • scope the query:  where: { id: req.params.id, userId: req.user.id }');
  console.error('    • add requireSelf / requireAdmin to the route');
  console.error('    • if the write is genuinely shared, add the key to SHARED_WRITE_ALLOWLIST');
  console.error('      in this script WITH a reason explaining why that is safe.\n');
}

if (failed) process.exit(1);

console.log('✓ Route auth-coverage check passed — every route is authenticated or explicitly public.');
console.log('✓ Route authorization check passed — every parameterized write is owner-scoped, role-gated, or justified.');
