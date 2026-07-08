#!/usr/bin/env node
'use strict';

// Standing check (Phase 0 gate): every API route must be behind authentication
// unless explicitly allow-listed as public. Fails CI when a route is added
// without auth — closing the "unauthenticated endpoint" class a prior audit
// flagged. Recognizes three ways a route is protected:
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

// Middleware names that constitute authentication / authorization.
const AUTH_TOKENS = ['authMiddleware', 'adminMiddleware', 'requireAdmin', 'requireSelf', 'roleMiddleware'];
const hasAuthToken = (s) => AUTH_TOKENS.some((t) => s.includes(t));

const REG = /router\.(get|post|put|delete|patch|all)\s*\(/g;
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

function routeFiles() {
  return fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.js')).map((f) => path.join(ROUTES_DIR, f));
}

const violations = [];
for (const file of routeFiles()) {
  const base = path.basename(file);
  const src = fs.readFileSync(file, 'utf8');

  // Router-level guard protects every route in the file.
  let routerGuarded = false;
  const useRe = /router\.use\s*\(([^)]*)\)/g;
  let u;
  while ((u = useRe.exec(src)) !== null) { if (hasAuthToken(u[1])) routerGuarded = true; }

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

    if (routerGuarded || hasAuthToken(argsSpan) || PUBLIC_ALLOWLIST.has(key)) continue;
    violations.push({ file: `src/routes/${base}`, line: lineOf(src, m.index), key });
  }
}

if (violations.length > 0) {
  console.error('\n✖ Route auth-coverage check FAILED — these routes have no authentication:');
  for (const v of violations) console.error(`  ${v.file}:${v.line}  ${v.key}`);
  console.error('\n  Add authMiddleware (or an admin/self guard), or, if the route is intentionally');
  console.error('  public, add its "<file> <METHOD> <path>" key to PUBLIC_ALLOWLIST in this script.\n');
  process.exit(1);
}

console.log('✓ Route auth-coverage check passed — every route is authenticated or explicitly public.');
