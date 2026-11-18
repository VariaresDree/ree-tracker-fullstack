// src/features/materials/handoutLink.js
//
// What a handout link is, and how learners get to it (2026-11-18). Google
// refuses to show a Drive FOLDER page, and most websites, inside another app's
// frame, so a pasted folder or site used to open as a blank box. Now:
//   - YouTube (video, short, live, playlist): plays in the app;
//   - a Drive file: Drive's preview in the app, as before;
//   - a Drive folder: its file list in the app (Drive's embeddable folder view),
//     with Open in Google Drive;
//   - Google Docs, Slides, Sheets: their preview in the app, with Open;
//   - any other site: opens in the browser, outside the app.
import { linkUrl } from '@ree/shared';
import { driveFileId } from '../../utils/pdfUrl';

const hostOf = (url) => new URL(url).hostname.replace(/^(www|m)\./, '');

/** The embeddable YouTube player URL for a video or playlist link, or null. */
export function youtubeEmbed(value) {
  const url = linkUrl(value);
  if (!url) return null;
  const u = new URL(url);
  const host = hostOf(url);
  const youtube = host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com';
  if (host !== 'youtu.be' && !youtube) return null;
  const id = host === 'youtu.be'
    ? u.pathname.slice(1).split('/')[0]
    : u.searchParams.get('v') || /^\/(?:shorts|live|embed)\/([\w-]{11})/.exec(u.pathname)?.[1] || null;
  const list = youtube ? u.searchParams.get('list') : null;
  if (!id && list) return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(list)}`;
  return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null;
}

/** A Google Drive folder's id, or null. */
export function driveFolderId(value) {
  const url = linkUrl(value);
  if (!url || hostOf(url) !== 'drive.google.com') return null;
  const u = new URL(url);
  return /\/folders\/([\w-]+)/.exec(u.pathname)?.[1]
    || (u.pathname.startsWith('/embeddedfolderview') ? u.searchParams.get('id') : null);
}

const DOC_KINDS = ['document', 'presentation', 'spreadsheets'];

/** The preview URL of a Google Doc, Slides deck or Sheet, or null. */
export function googleDocPreview(value) {
  const url = linkUrl(value);
  if (!url || hostOf(url) !== 'docs.google.com') return null;
  const m = /^\/(document|presentation|spreadsheets)\/d\/([\w-]+)/.exec(new URL(url).pathname);
  return m && DOC_KINDS.includes(m[1]) ? `https://docs.google.com/${m[1]}/d/${m[2]}/preview` : null;
}

/** Drive's in-app list of a folder's files. */
export const folderEmbedUrl = (id) => `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(id)}#list`;
/** The folder's own page in Google Drive (the Drive app on a phone). */
export const folderOpenUrl = (id) => `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;

/**
 * A pasted link, read: { url, type, host } with type one of video, pdf (a
 * Drive file), folder, doc or link; null if it isn't an http(s) address.
 */
export function readHandoutLink(value) {
  const url = linkUrl(value);
  if (!url) return null;
  const host = hostOf(url);
  if (youtubeEmbed(url)) return { url, type: 'video', host };
  if (driveFolderId(url)) return { url, type: 'folder', host };
  if (driveFileId(url)) return { url, type: 'pdf', host };
  if (googleDocPreview(url)) return { url, type: 'doc', host };
  return { url, type: 'link', host };
}

/** What the admin is told about the link before adding it. */
export function linkHint(link) {
  if (!link) return null;
  switch (link.type) {
    case 'video': return 'YouTube: plays here in the app.';
    case 'folder': return 'Google Drive folder: learners see its files here and can open it in Google Drive. Share it as "Anyone with the link".';
    case 'pdf': return 'Google Drive file: shows here in the app. Share it as "Anyone with the link".';
    case 'doc': return 'Google Docs, Slides or Sheets: a preview shows here in the app.';
    default: return `Website (${link.host}): opens in the learner's browser.`;
  }
}

/** The site's name for a tile, like "nptel.ac.in". */
export function linkHost(url) {
  try { return hostOf(url); } catch { return ''; }
}
