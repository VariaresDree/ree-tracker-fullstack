// src/components/syncLabels.js
//
// Plain names for what a queued write was doing, for Sync issues. The panel
// used to show the raw endpoint ("/api/user/mistakes/q123") and the server's
// own error text, which told a learner nothing about what they'd lose by
// discarding it. Matched by path prefix; the first match wins.

// Printed paper sets nest their scanned sheets under the set's path.
const printedSetLabel = (m, path) => {
  if (/\/sheets(\/|$)/.test(path)) {
    if (m === 'DELETE') return 'Deleting a scanned answer sheet';
    return m === 'PATCH' ? 'A correction to a scanned answer sheet' : 'A scanned answer sheet';
  }
  if (m === 'DELETE') return 'Deleting a printed paper set';
  return m === 'PATCH' ? 'Changes to a printed paper set' : 'A printed paper set';
};

const LABELS = [
  ['/api/analytics/telemetry-bulk', () => 'Answers from a mock board'],
  ['/api/analytics/study-sessions', () => 'A practice session'],
  ['/api/exams/sessions/', () => 'A finished mock board'],
  ['/api/exams/grade', () => 'A Gauntlet run'],
  ['/api/exams/gauntlet/forfeit', () => 'A Gauntlet forfeit'],
  ['/api/user/mistakes', () => 'A mistake tag'],
  ['/api/user/notes', (m) => (m === 'DELETE' ? 'Deleting a note' : 'A note')],
  ['/api/user/card-reviews', () => 'A formula card rating'],
  ['/api/user/focus-blocks', (m) => (m === 'DELETE' ? 'Deleting a focus block' : 'A focus block')],
  ['/api/user/syllabus', () => 'A syllabus check-off'],
  ['/api/user/outside-scores', (m) => (m === 'DELETE' ? 'Deleting an outside score' : 'An outside score')],
  ['/api/user/key-dates', (m) => (m === 'DELETE' ? 'Deleting a key date' : 'A key date')],
  ['/api/user/plan-prefs', () => 'Your rest days and how you review'],
  ['/api/user/practice-sets', (m) => (m === 'DELETE' ? 'Deleting a set' : 'A set to finish')],
  ['/api/user/links', (m) => (m === 'DELETE' ? 'Deleting a link' : 'A link')],
  ['/api/user/printed-sets', printedSetLabel],
  ['/api/user/reminders', () => 'Your reminder time'],
  ['/api/user/settings', () => 'Your exam date and daily target'],
  ['/api/materials/folders', () => 'A folder change'],
  ['/api/materials/upload', () => 'A file upload'],
  ['/api/materials/', () => 'A file change'],
];

export function syncActionLabel(endpoint, method) {
  const path = String(endpoint || '');
  const hit = LABELS.find(([prefix]) => path.startsWith(prefix));
  return hit ? hit[1](String(method || '').toUpperCase(), path) : 'A saved change';
}

// Why it stopped, in words: the HTTP status says whether retrying can help.
export function syncFailureReason(letter) {
  const status = Number(letter?.status) || 0;
  if (/gave up after/.test(letter?.error || '')) return "It kept failing to send, so it stopped trying.";
  if (status === 401 || status === 403) return "The server didn't accept it for this account.";
  if (status === 404) return 'What it changed no longer exists.';
  if (status === 409) return 'It clashed with a newer change.';
  if (status >= 400 && status < 500) return "The server couldn't accept it as sent.";
  if (status >= 500) return 'The server had a problem. Retrying usually works.';
  return "It couldn't be sent.";
}
