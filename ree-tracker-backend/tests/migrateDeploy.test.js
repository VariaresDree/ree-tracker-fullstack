import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { isTransient, WAITS_S } = require('../scripts/migrateDeploy.js');

describe('migrateDeploy retry', () => {
    it('retries when the session pooler is full', () => {
        expect(isTransient('Error: Schema engine error:\nFATAL: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15')).toBe(true);
        expect(isTransient("Error: P1001: Can't reach database server at `x:5432`")).toBe(true);
        expect(isTransient('FATAL: sorry, too many clients already')).toBe(true);
    });

    it('does not retry a migration that is actually wrong', () => {
        expect(isTransient('Error: P3009 migrate found failed migrations in the target database')).toBe(false);
        expect(isTransient('Error: P3018 A migration failed to apply. Database error: column "x" already exists')).toBe(false);
        expect(isTransient('The migration `20261013_x` was modified after it was applied.')).toBe(false);
    });

    it('waits at most a few minutes in total', () => {
        expect(WAITS_S.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(180);
    });
});
