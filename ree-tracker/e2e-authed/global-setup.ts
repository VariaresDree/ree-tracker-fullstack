import { createRequire } from 'node:module';

// Signs the learner up on the Auth emulator and writes their rows (seed.cjs).
const require = createRequire(import.meta.url);

export default async function globalSetup() {
  const { seed } = require('./seed.cjs');
  await seed();
}
