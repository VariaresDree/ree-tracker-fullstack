// src/features/shared-quizzes/sharedState.js
import { CANONICAL_SUBJECTS } from '@ree/shared';

// quizIdFor (quiz-launcher) takes the first 32 hex digits of the same SHA-256 the
// server stores as the checksum, so a shared file and a device copy match by bytes.
export const deviceIdOf = (file) => file.checksum.slice(0, 32);

/** Where a shared file stands on this device: saved, an older version saved, or neither. */
export function sharedState(file, entries) {
  const ready = entries.filter((e) => e.status === 'ready');
  const saved = ready.find((e) => e.id === deviceIdOf(file));
  if (saved) return { kind: 'saved', entry: saved };
  const older = ready.find((e) => e.shared?.id === file.id);
  if (older) return { kind: 'update', entry: older };
  return { kind: 'new', entry: null };
}

/** Its name on the device, with the extension the file needs if it's saved back out. */
export function deviceFileName(file) {
  const ext = file.fileName.match(/\.[^.]+$/)?.[0] || '.quiz';
  return file.name.toLowerCase().endsWith(ext.toLowerCase()) ? file.name : `${file.name}${ext}`;
}

/** Subjects in the board's order, with anything unfiled last. */
export function bySubject(files) {
  const groups = [...CANONICAL_SUBJECTS, null].map((subject) => ({
    subject,
    label: subject || 'General',
    files: files.filter((f) => (subject ? f.subject === subject : !CANONICAL_SUBJECTS.includes(f.subject))),
  }));
  return groups.filter((g) => g.files.length > 0);
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const countLine = (n, skipped = 0) => `${n} question${n === 1 ? '' : 's'}${skipped > 0 ? `, ${skipped} skipped` : ''}`;
