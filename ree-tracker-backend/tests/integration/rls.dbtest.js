import { describe, it, expect, afterAll } from 'vitest';

// Every table has row-level security, as migration 20261019000000 left them.
// A new model's migration must enable it too (the migration is idempotent
// and only ran once): this lists any table that was created without it.

const prisma = require('../../src/config/db');

afterAll(async () => { await prisma.$disconnect(); });

describe('row-level security', () => {
    it('is on for every table but Prisma’s own', async () => {
        const rows = await prisma.$queryRaw`
            SELECT c.relname AS name
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = current_schema()
              AND c.relkind = 'r'
              AND c.relname <> '_prisma_migrations'
              AND NOT c.relrowsecurity
            ORDER BY 1`;
        expect(rows.map((r) => r.name)).toEqual([]);
    });
});
