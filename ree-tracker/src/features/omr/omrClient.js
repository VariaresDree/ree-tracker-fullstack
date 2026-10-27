// src/features/omr/omrClient.js
//
// The scanner screen's handle on the OMR pipeline. It runs in a module
// worker, so a 2400 px read never blocks the camera preview; where a worker
// can't start (an old WebView, a blocked script), it falls back to running
// the same code on the main thread, loaded on demand.
//
//   const omr = createOmrClient();
//   const live = await omr.detect(frameImageData);          // ~640 px frames
//   const read = await omr.read(photoImageData, { printId, optionCounts, reviewPpm: 3 });
//   omr.terminate();
//
// Images are ImageData or `{ data, width, height }` RGBA. Their buffer is
// transferred to the worker (the caller's copy is emptied); pass
// `{ transfer: false }` as the third argument to keep it.

export { REASON_HINTS, OMR_REASONS, hintFor } from './reasons';

const HAS_WORKER = typeof Worker !== 'undefined';

/**
 * @param {{
 *   useWorker?: boolean,          // false: always the main thread
 *   createWorker?: () => Worker,  // for tests
 *   readyTimeoutMs?: number,      // a worker that hasn't said 'ready' by then is dropped (5000)
 * }} [options]
 * @returns {{
 *   detect: (img, opts?, how?: { transfer?: boolean }) => Promise<object>,  // detectFiducials' result
 *   read: (img, opts, how?: { transfer?: boolean }) => Promise<object>,     // readSheet's result
 *   terminate: () => void,
 *   readonly mode: 'pending' | 'worker' | 'main' | 'closed',
 * }}
 */
export function createOmrClient({ useWorker = true, createWorker, readyTimeoutMs = 5000 } = {}) {
  let worker = null;
  let mode = 'pending';
  let nextId = 1;
  let readyTimer = null;
  let mainModule = null;
  const inFlight = new Map(); // id -> request, posted to the worker
  const waiting = []; // requests made before the worker said 'ready'

  const runMain = (msg) => {
    mainModule = mainModule || import('./omrHandler');
    return mainModule.then(({ handleOmrRequest }) => {
      const { reply } = handleOmrRequest(msg);
      if (reply.ok) return reply.result;
      throw new Error(reply.error);
    });
  };

  const post = (req) => {
    inFlight.set(req.msg.id, req);
    try {
      worker.postMessage(req.msg, req.transfer);
    } catch (err) {
      inFlight.delete(req.msg.id);
      req.reject(err);
    }
  };

  const fallBack = (why) => {
    if (mode === 'main' || mode === 'closed') return;
    mode = 'main';
    clearTimeout(readyTimer);
    if (worker) {
      try { worker.terminate(); } catch { /* already gone */ }
    }
    worker = null;
    // Never posted, so their images are intact: run them here.
    waiting.splice(0).forEach((req) => runMain(req.msg).then(req.resolve, req.reject));
    // Posted: their images went to the worker with it.
    inFlight.forEach((req) => req.reject(new Error(`The scanner stopped (${why}). Try again.`)));
    inFlight.clear();
  };

  if (useWorker && (createWorker || HAS_WORKER)) {
    try {
      worker = createWorker ? createWorker() : new Worker(new URL('./omr.worker.js', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
  }

  if (!worker) {
    mode = 'main';
  } else {
    worker.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === 'ready') {
        if (mode !== 'pending') return;
        mode = 'worker';
        clearTimeout(readyTimer);
        waiting.splice(0).forEach(post);
        return;
      }
      const req = inFlight.get(data.id);
      if (!req) return;
      inFlight.delete(data.id);
      if (data.ok) req.resolve(data.result);
      else req.reject(new Error(data.error || 'The scanner failed.'));
    };
    worker.onerror = (event) => {
      if (event && event.preventDefault) event.preventDefault();
      fallBack('error');
    };
    worker.onmessageerror = () => fallBack('messageerror');
    readyTimer = setTimeout(() => { if (mode === 'pending') fallBack('timeout'); }, readyTimeoutMs);
  }

  const request = (type, img, opts, { transfer = true } = {}) => new Promise((resolve, reject) => {
    if (mode === 'closed') {
      reject(new Error('The scanner is closed.'));
      return;
    }
    const msg = { id: nextId, type, img, opts };
    nextId += 1;
    if (mode === 'main') {
      runMain(msg).then(resolve, reject);
      return;
    }
    const buffer = transfer && img && img.data && img.data.buffer;
    const req = { msg, resolve, reject, transfer: buffer ? [buffer] : [] };
    if (mode === 'pending') waiting.push(req);
    else post(req);
  });

  return {
    detect: (img, opts = {}, how) => request('detect', img, opts, how),
    read: (img, opts = {}, how) => request('read', img, opts, how),
    terminate() {
      clearTimeout(readyTimer);
      if (worker) {
        try { worker.terminate(); } catch { /* already gone */ }
      }
      worker = null;
      const closed = new Error('The scanner is closed.');
      waiting.splice(0).forEach((req) => req.reject(closed));
      inFlight.forEach((req) => req.reject(closed));
      inFlight.clear();
      mode = 'closed';
    },
    get mode() {
      return mode;
    },
  };
}
