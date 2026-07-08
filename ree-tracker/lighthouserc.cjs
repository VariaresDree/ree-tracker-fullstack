// Lighthouse CI budgets. The app is fully auth-gated, so CI can only reach the
// entry/login path — but that's where first-load LCP/CLS matter most. Accessibility
// is a hard gate (regressions fail the build); the perf metrics are warnings since
// CI runners are noisy. Authed-screen Lighthouse is a documented local/manual step
// (see ROADMAP.md Phase 2) until a test-auth path exists.
//
// .cjs (not .js) because the frontend package is "type": "module".
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      numberOfRuns: 1,
      settings: { chromeFlags: '--no-sandbox --headless=new' },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }], // INP proxy in lab
      },
    },
    upload: { target: 'filesystem', outputDir: './.lighthouseci' },
  },
};
