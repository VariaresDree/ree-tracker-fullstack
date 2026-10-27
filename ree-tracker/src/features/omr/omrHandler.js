// src/features/omr/omrHandler.js
//
// One request in, one reply out: shared by the worker (omr.worker.js) and the
// client's main-thread fallback, so both behave the same.
//
//   request: { id, type: 'detect' | 'read' | 'ping', img: { data, width, height }, opts }
//   reply:   { id, ok: true, result } | { id, ok: false, error }

import { detectFiducials, readSheet } from './pipeline';

/**
 * @returns {{ reply: object, transfer: ArrayBuffer[] }} transfer: buffers in the
 *   reply that can be moved rather than copied (the review image)
 */
export function handleOmrRequest(msg) {
  const { id, type, img, opts } = msg || {};
  try {
    if (type === 'ping') return { reply: { id, ok: true, result: 'pong' }, transfer: [] };
    if (type === 'detect') return { reply: { id, ok: true, result: detectFiducials(img, opts) }, transfer: [] };
    if (type === 'read') {
      const result = readSheet(img, opts);
      return { reply: { id, ok: true, result }, transfer: result.review ? [result.review.data.buffer] : [] };
    }
    return { reply: { id, ok: false, error: `Unknown scanner request: ${type}` }, transfer: [] };
  } catch (err) {
    return { reply: { id, ok: false, error: String((err && err.message) || err) }, transfer: [] };
  }
}
