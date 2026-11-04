import { defineConfig, devices } from '@playwright/test';

// Signed-in flows, end to end: the Firebase Auth emulator, the real backend on
// a test Postgres (DATABASE_URL, migrations applied), and the Vite dev server
// pointed at both. `npm run e2e:authed` (CI: the "E2E (signed in)" job).
// global-setup.ts signs a learner up on the emulator and seeds their rows.
// One worker: the specs share that learner.
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ree:ree@localhost:5432/ree_ci';
const EMULATOR = '127.0.0.1:9099';
const FRONTEND_ENV = {
  VITE_BACKEND_URL: 'http://localhost:5000',
  VITE_FIREBASE_AUTH_EMULATOR: `http://${EMULATOR}`,
  VITE_FIREBASE_PROJECT_ID: 'demo-ree',
  VITE_FIREBASE_API_KEY: 'demo-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'localhost',
};

export default defineConfig({
  testDir: './e2e-authed',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report-authed' }]] : 'list',
  globalSetup: './e2e-authed/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // A machine with its own Chromium (not the one Playwright downloads).
    ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
  },
  webServer: [
    {
      command: 'npx --yes firebase-tools@14 emulators:start --only auth --project demo-ree --config e2e-authed/firebase.json',
      url: `http://${EMULATOR}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'node server.js',
      cwd: '../ree-tracker-backend',
      url: 'http://localhost:5000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      // One browser making every request of a whole run: a11y-sweep alone opens about 100
      // screens, and past the default 3,000 per 15 minutes the later specs got only 429s.
      env: { DATABASE_URL, FIREBASE_AUTH_EMULATOR_HOST: EMULATOR, FIREBASE_PROJECT_ID: 'demo-ree', PORT: '5000', NODE_ENV: 'test', RATE_LIMIT_GLOBAL_MAX: '100000', ...(process.env.DATABASE_SSL ? { DATABASE_SSL: process.env.DATABASE_SSL } : {}) },
    },
    {
      command: 'npx vite --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: FRONTEND_ENV,
    },
    {
      // A built app with its service worker, for zz-offline.spec. NODE_ENV=development
      // is what lets a build use the Auth emulator: real builds refuse it (firebaseDb.js).
      command: 'npx vite build --outDir node_modules/.e2e-offline --emptyOutDir && npx vite preview --outDir node_modules/.e2e-offline --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: { ...FRONTEND_ENV, NODE_ENV: 'development' },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
      },
    },
  ],
});
