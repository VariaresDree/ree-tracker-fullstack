// src/utils/lazyWithRetry.js
//
// React.lazy keeps a failed import for good: a screen whose chunk failed to
// load once (a network blip, the server waking) threw the same error on every
// "Try again" until the page was reloaded. This retries the import twice, a
// moment apart, before giving up; a chunk that is really gone (an old version
// after a deploy) is handled in main.jsx, which reloads once.
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
