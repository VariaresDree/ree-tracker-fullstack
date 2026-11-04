// src/features/backup/accountRestore.js
//
// Bringing your own records back from a backup, through the routes the app already uses.
// One rule: add what's missing, and never overwrite. A note you've edited since the
// backup stays as it is, and running a restore twice does nothing the second time.
//
// Graded answers and ratings are in the file for you to keep, and are never restored:
// only the server grades answers, so a backup file can't be a way to raise a score.
import { apiRequest } from '../../services/dbQueries';

const enc = encodeURIComponent;

const KINDS = [
  {
    key: 'notes',
    label: 'Notes',
    idOf: (r) => `${r.targetType}:${r.targetId}`,
    request: (r) => ['PUT', `/api/user/notes/${enc(r.targetType)}/${enc(r.targetId)}`, { body: r.body }],
  },
  {
    key: 'syllabus',
    label: 'Syllabus ticks',
    idOf: (r) => r.topicId,
    request: (r) => ['PUT', `/api/user/syllabus/${enc(r.topicId)}`, r],
  },
  {
    key: 'subtopics',
    label: 'Your subtopics',
    idOf: (r) => r.id,
    request: (r) => ['PUT', `/api/user/syllabus-subtopics/${enc(r.id)}`, r],
  },
  {
    key: 'mistakes',
    label: 'Mistake tags',
    idOf: (r) => r.questionId,
    request: (r) => ['PUT', `/api/user/mistakes/${enc(r.questionId)}`, { cause: r.cause, resolved: !!r.resolvedAt }],
  },
  {
    key: 'practiceSets',
    label: 'Practice sets',
    idOf: (r) => r.id,
    request: (r) => ['POST', '/api/user/practice-sets', r],
  },
  {
    key: 'links',
    label: 'Your links',
    idOf: (r) => r.id,
    request: (r) => ['POST', '/api/user/links', r],
  },
  {
    key: 'keyDates',
    label: 'Key dates',
    idOf: (r) => r.id,
    request: (r) => ['POST', '/api/user/key-dates', r],
  },
  {
    key: 'outsideScores',
    label: 'Outside scores',
    idOf: (r) => r.id,
    // A retest points at the score it retests, so that one has to exist first.
    order: (rows) => [...rows].sort((a, b) => Number(!!a.retestOfId) - Number(!!b.retestOfId)),
    request: (r) => ['POST', '/api/user/outside-scores', r],
  },
];

/** What's in the file but not on your account, as the requests that would add it. */
export function planAccountRestore(backup, current) {
  const kinds = [];
  const ops = [];
  for (const kind of KINDS) {
    const rows = backup?.rows?.[kind.key] || [];
    const here = new Set((current?.rows?.[kind.key] || []).map(kind.idOf));
    const missing = rows.filter((r) => !here.has(kind.idOf(r)));
    if (rows.length > 0) kinds.push({ key: kind.key, label: kind.label, add: missing.length, already: rows.length - missing.length });
    const ordered = kind.order ? kind.order(missing) : missing;
    for (const row of ordered) {
      const [method, url, body] = kind.request(row);
      ops.push({ kind: kind.label, method, url, body });
    }
  }
  const prefs = backup?.user?.drawPrefs;
  if (prefs && !current?.user?.drawPrefs) {
    kinds.push({ key: 'drawPrefs', label: 'How your mocks are picked', add: 1, already: 0 });
    ops.push({ kind: 'How your mocks are picked', method: 'PUT', url: '/api/user/draw-prefs', body: prefs });
  }
  return { kinds, ops };
}

/**
 * Run the plan one request at a time, on a server that's slow per query. A record the
 * server won't take is counted and the rest carry on. Losing the connection stops it, and
 * running it again picks up what's left.
 */
export async function runAccountRestore(ops, { onProgress = () => {}, request = apiRequest } = {}) {
  const result = { added: 0, failed: [], stopped: false };
  for (const [i, op] of ops.entries()) {
    onProgress(`Restoring your records: ${i + 1} of ${ops.length}…`);
    try {
      await request(op.url, op.method, op.body, { timeoutMs: 60_000 });
      result.added += 1;
    } catch (err) {
      if (err?.message === '[OFFLINE]' || err?.message === '[TIMEOUT]') {
        result.stopped = true;
        break;
      }
      result.failed.push({ kind: op.kind, reason: err?.message || 'The server refused it.' });
    }
  }
  return result;
}

export const fetchAccountExport = () => apiRequest('/api/user/export', 'GET', null, { timeoutMs: 120_000 });
