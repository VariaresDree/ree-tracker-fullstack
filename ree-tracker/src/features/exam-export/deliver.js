// src/features/exam-export/deliver.js
//
// Getting the files to the learner: a download in the browser, or the text on
// the clipboard. The Android app has no file-saving plugin (a download goes
// nowhere in its WebView), so there only Copy is offered.
import { Capacitor } from '@capacitor/core';

/** False in the native app, where a download link saves nothing. */
export function canDownloadFiles() {
  try {
    return !Capacitor.isNativePlatform();
  } catch {
    return true;
  }
}

/** Save a Blob under `filename` through a temporary link. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the click has been handled, or some browsers cancel it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Put text on the clipboard: the Clipboard API, else a hidden textarea and
 * execCommand('copy') (older WebViews, or a page without clipboard access).
 * @returns {Promise<boolean>} whether it worked
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to the textarea */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand?.('copy') ?? false;
    ta.remove();
    return !!ok;
  } catch {
    return false;
  }
}
