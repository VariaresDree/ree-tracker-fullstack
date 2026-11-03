// src/utils/pdfUrl.js
// A PDF's url for the viewer's frame, and for opening it elsewhere. Google Drive
// links must use the /preview URL (Drive renders its own viewer, with its own
// zoom toolbar).
const driveId = (url) => /\/d\/([a-zA-Z0-9_-]+)/.exec(url)?.[1] ?? null;

export const isDriveUrl = (url) => String(url || '').includes('drive.google.com');

export function normalizePdfUrl(url) {
  const pdfUrl = url || '';
  if (!isDriveUrl(pdfUrl)) return pdfUrl;
  const id = driveId(pdfUrl);
  return id ? `https://drive.google.com/file/d/${id}/preview` : pdfUrl.replace(/\/(view|edit)(.*)$/g, '/preview');
}

/** Where to open it outside the app: Drive's page (the Drive app on a phone), or the file. */
export function externalPdfUrl(url) {
  const id = isDriveUrl(url) ? driveId(url) : null;
  return id ? `https://drive.google.com/file/d/${id}/view` : url;
}
