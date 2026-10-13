import { defineConfig } from 'vitest/config';

// Tests against a real Postgres (`npm run test:db`). The CI "Backend (real
// Postgres)" job applies the migrations to an empty database first, so these
// catch what the mocked suite can't: a query or relation filter Prisma rejects,
// or a migration that doesn't match schema.prisma. Each file runs alone
// (they share one database) and cleans up the rows it made.
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/integration/**/*.dbtest.js'],
        fileParallelism: false,
        testTimeout: 20_000,
    },
});
