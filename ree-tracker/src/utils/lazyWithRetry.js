// src/utils/lazyWithRetry.js
//
// React.lazy keeps a failed import for good, so this retries it twice, a moment apart.
// That helps where the browser tries the file again. Chromium doesn't: a page remembers
// a failed import until it reloads (checked in a real browser), so there the reload in
// services/chunkRecovery is what fixes it.
import { lazy as reactLazy } from 'react';

export const IMPORT_RETRY_DELAYS_MS = [600, 1_800];

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/** Run `factory`, retrying after each delay in `delays` when it rejects. */
export async function importWithRetry(factory, delays = IMPORT_RETRY_DELAYS_MS) {
    for (let i = 0; ; i += 1) {
        try {
            return await factory();
        } catch (err) {
            if (i >= delays.length) throw err;
            await wait(delays[i]);
        }
    }
}

/** React.lazy with retries. Same signature, so screens import it as `lazy`. */
export const lazy = (factory) => reactLazy(() => importWithRetry(factory));
