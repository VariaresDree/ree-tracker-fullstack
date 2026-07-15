// src/utils/pdfUrl.js
// Normalize a PDF url for iframe embedding. Google Drive links must use the
// /preview URL (Drive renders its own viewer — its chrome can't be stripped);
// hosted/raw PDFs get #toolbar=0 to hide the native browser PDF toolbar.
// Shared by MediaViewer (inline) and FullscreenPdfViewer.
export function normalizePdfUrl(url) {
  let pdfUrl = url || '';
  if (pdfUrl.includes('drive.google.com')) {
    const driveIdMatch = pdfUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return driveIdMatch && driveIdMatch[1]
      ? `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`
      : pdfUrl.replace(/\/(view|edit)(.*)$/g, '/preview');
  }
  return `${pdfUrl}#toolbar=0`;
}
