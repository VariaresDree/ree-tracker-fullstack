// src/features/paper-sets/scan/qrReader.js
//
// The answer sheet's QR code (REE2:<set code>:P1/2:A4:K<key>), read with the
// browser's own BarcodeDetector where it has one (Chrome on Android, Safari
// on recent iPhones). It names the set and the page, so /scan can open the
// right set by itself. Elsewhere it is simply not used: the set comes from the
// link or the picker, and the sheet's ID strip still catches a wrong set.
import { parseQrPayload } from '../../exam-export/sheetLayout';

let detector = null;

/** A QR BarcodeDetector, or null when this browser has none. */
export async function qrDetector() {
  if (detector !== null) return detector || null;
  detector = false;
  try {
    const BD = typeof window !== 'undefined' ? window.BarcodeDetector : undefined;
    if (typeof BD !== 'function') return null;
    const formats = typeof BD.getSupportedFormats === 'function' ? await BD.getSupportedFormats() : [];
    if (formats.includes('qr_code')) detector = new BD({ formats: ['qr_code'] });
  } catch {
    detector = false;
  }
  return detector || null;
}

/**
 * Our payload from an image, a video or ImageData, or null (no detector, no
 * code, or someone else's code).
 * @returns {Promise<{ printId, pageIndex, pageCount, paper, keyVersion }|null>}
 */
export async function readQr(source) {
  const d = await qrDetector();
  if (!d || !source) return null;
  try {
    const codes = await d.detect(source);
    for (const code of codes || []) {
      const parsed = parseQrPayload(code.rawValue);
      if (parsed) return parsed;
    }
  } catch { /* a frame it couldn't read */ }
  return null;
}

/** Test seam. */
export function __resetQrDetector() {
  detector = null;
}
