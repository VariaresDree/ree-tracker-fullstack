import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Force the local-disk driver and isolate to a temp dir before requiring the
// module, since the driver decision happens at require-time.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ree-storage-'));
process.env.LOCAL_STORAGE_DIR = TMP;
delete process.env.STORAGE_DRIVER;

const storage = require('../src/services/storage');

describe('storage (local driver)', () => {
    afterAll(() => {
        // best-effort cleanup
        try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
    });

    it('reports the local driver', () => {
        expect(storage.driverName).toBe('local');
    });

    it('writes a file under the configured directory and returns a /uploads URL', async () => {
        const key = storage.makeKey('folder-x', 'note.txt');
        const { url } = await storage.put({ key, body: Buffer.from('hello'), contentType: 'text/plain' });
        expect(url.startsWith('/uploads/')).toBe(true);
        const fullPath = path.join(TMP, key);
        expect(fs.existsSync(fullPath)).toBe(true);
        expect(fs.readFileSync(fullPath, 'utf8')).toBe('hello');
    });

    it('deletes the file from disk', async () => {
        const key = storage.makeKey('folder-y', 'gone.bin');
        await storage.put({ key, body: Buffer.from([1, 2, 3]), contentType: 'application/octet-stream' });
        await storage.delete(key);
        expect(fs.existsSync(path.join(TMP, key))).toBe(false);
    });

    it('sanitizes path-unfriendly characters in the original name', () => {
        const key = storage.makeKey('f', '../../etc/passwd');
        expect(key.includes('..')).toBe(false);
    });
});
