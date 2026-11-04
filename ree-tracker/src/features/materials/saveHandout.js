// src/features/materials/saveHandout.js
//
// Save a handout for offline. Every handout is a Google Drive link, and a browser
// can't read Drive's download address (CORS), but Drive's API allows it with a key.
// The key is visible in the browser by design, so its restrictions in Google Cloud
// (the Drive API, this site) are what protect it. With no key, the button hides.
import { checkSpace } from '../../services/deviceFiles';
import { driveFileId } from '../../utils/pdfUrl';

const API = 'https://www.googleapis.com/drive/v3/files';
const driveKey = () => import.meta.env.VITE_GOOGLE_DRIVE_KEY || '';

/** Can this one be saved? Only a PDF on Drive, with a key to ask for it. */
export const canSaveOffline = (material) => !!driveKey() && material?.type === 'pdf' && !!driveFileId(material?.url);

const startsLikePdf = async (blob) => (await blob.slice(0, 5).text()) === '%PDF-';

function failure(status) {
  if (status === 404) return 'Drive says this file is gone, or isn’t shared with anyone who has the link.';
  if (status === 403) return 'Drive wouldn’t hand this one over. Very large files, and files many people have just downloaded, can be refused.';
  return 'Drive didn’t send this file.';
}

/**
 * Fetch a handout's PDF from Drive.
 * @param onProgress called with 0 to 1, when the size is known
 * @returns a PDF Blob. Throws with a message fit to show.
 */
export async function downloadHandout(material, { onProgress, signal } = {}) {
  const id = driveFileId(material.url);
  const query = `key=${encodeURIComponent(driveKey())}`;
  let details;
  let response;
  try {
    details = await fetch(`${API}/${encodeURIComponent(id)}?fields=size,mimeType&${query}`, { signal });
    if (!details.ok) throw Object.assign(new Error(failure(details.status)), { known: true });
    const { size, mimeType } = await details.json();
    if (mimeType && mimeType !== 'application/pdf') throw Object.assign(new Error('This one isn’t a PDF on Drive, so it can’t be saved here.'), { known: true });
    const expected = Number(size) || 0;
    if (expected) {
      try {
        await checkSpace(expected);
      } catch (err) {
        throw Object.assign(err, { known: true });
      }
    }

    response = await fetch(`${API}/${encodeURIComponent(id)}?alt=media&${query}`, { signal });
    if (!response.ok) throw Object.assign(new Error(failure(response.status)), { known: true });
    const total = expected || Number(response.headers.get('Content-Length')) || 0;
    const reader = response.body.getReader();
    const parts = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      received += value.length;
      if (total) onProgress?.(Math.min(1, received / total));
    }
    const blob = new Blob(parts, { type: 'application/pdf' });
    if (!(await startsLikePdf(blob))) throw Object.assign(new Error('What Drive sent isn’t a PDF.'), { known: true });
    return blob;
  } catch (err) {
    if (err?.known) throw err;
    if (err?.name === 'AbortError') throw err;
    throw new Error('Couldn’t reach Drive. Check your connection and try again.', { cause: err });
  }
}
