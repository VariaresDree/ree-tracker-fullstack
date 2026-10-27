// src/features/omr/omr.worker.js
//
// The scanner's module worker. Load it with
//   new Worker(new URL('./omr.worker.js', import.meta.url), { type: 'module' })
// (omrClient.js does). It says { type: 'ready' } once loaded, then answers
// each { id, type: 'detect' | 'read', img, opts } with { id, ok, result | error },
// moving the review image's buffer back rather than copying it.

import { handleOmrRequest } from './omrHandler';

self.onmessage = (event) => {
  const { reply, transfer } = handleOmrRequest(event.data);
  self.postMessage(reply, transfer);
};

self.postMessage({ type: 'ready' });
