// src/features/paper-sets/scan/imageInput.js
//
// Pixels in and out of the scanner, through a 2D canvas: a photo file or a
// video frame as RGBA ImageData (what the OMR engine reads), and the
// straightened sheet painted back for review. Kept apart from the screens so
// tests (jsdom has no canvas) can stand in for it.
//
// Photos never leave the device: nothing here uploads anything.

function canvasOf(w, h) {
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const fit = (w, h, maxSide) => {
  const s = Math.min(1, maxSide / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
};

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This file isn\u2019t a photo the scanner can open.')); };
    img.src = url;
  });
}

/**
 * A photo file as RGBA at most `maxSide` px on its long side, upright: the
 * camera's EXIF orientation is applied (a phone photo is often stored
 * sideways with a flag saying so).
 * @returns {Promise<ImageData>}
 */
export async function decodeImageFile(file, maxSide = 2400) {
  let source = null;
  if (typeof createImageBitmap === 'function') {
    try {
      source = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      source = null;
    }
  }
  // An <img> applies EXIF orientation too (CSS image-orientation: from-image).
  if (!source) source = await loadImage(file);
  const { w, h } = fit(source.width || source.naturalWidth, source.height || source.naturalHeight, maxSide);
  const canvas = canvasOf(w, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);
  source.close?.();
  return ctx.getImageData(0, 0, w, h);
}

const frameCanvases = new Map();

/** The video's current frame as RGBA at most `maxSide` px long, or null before the first frame. */
export function frameFromVideo(video, maxSide) {
  const vw = video?.videoWidth;
  const vh = video?.videoHeight;
  if (!vw || !vh) return null;
  const { w, h } = fit(vw, vh, maxSide);
  // One canvas per size, reused: the live loop asks ~7 times a second.
  const key = `${w}x${h}`;
  let canvas = frameCanvases.get(key);
  if (!canvas) {
    canvas = canvasOf(w, h);
    frameCanvases.set(key, canvas);
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/** Paint RGBA (the engine's review image) onto a <canvas>. */
export function paintImageData(canvas, img) {
  if (!canvas || !img) return;
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
}

/**
 * A rectangle of RGBA (px) as a PNG data URL, for an <img>: the name box
 * cropped from the straightened sheet.
 * @returns {string|null}
 */
export function cropToDataUrl(img, { x, y, w, h }) {
  if (!img || typeof document === 'undefined') return null;
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const cw = Math.min(img.width - x0, Math.round(w));
  const ch = Math.min(img.height - y0, Math.round(h));
  if (cw <= 0 || ch <= 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.putImageData(new ImageData(img.data, img.width, img.height), -x0, -y0, x0, y0, cw, ch);
  return canvas.toDataURL('image/png');
}
