// src/features/backup/backup.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { unzipSync } from 'fflate';
import * as idb from 'idb-keyval';
import { addDeviceFile, createDeviceFolder, getDeviceFileBlob, listDeviceFiles, listDeviceFolders } from '../../services/deviceFiles';
import { addQuizFiles, __resetQuizSession, refreshQuizzes } from '../quiz-launcher/quizSession';
import { getAttempts, getRun, listQuizzes, recordAttempt, saveRun } from '../quiz-launcher/quizStore';
import { planAccountRestore, runAccountRestore } from './accountRestore';
import { backupFileName, buildBackup, measureBackup, openBackup, previewDevice, restoreDevice, unlockBackup } from './backupFile';
import { BackupError, ZipWriter, crc32, readZip } from './storedZip';

vi.mock('idb-keyval', () => {
  const data = new Map();
  return {
    __data: data,
    createStore: () => 'store',
    get: vi.fn(async (k) => data.get(k)),
    set: vi.fn(async (k, v) => { data.set(k, v); }),
    del: vi.fn(async (k) => { data.delete(k); }),
    delMany: vi.fn(async (ks) => { ks.forEach((k) => data.delete(k)); }),
    keys: vi.fn(async () => [...data.keys()]),
    getMany: vi.fn(async (ks) => ks.map((k) => data.get(k))),
  };
});
vi.mock('../../services/dbQueries', () => ({ apiRequest: vi.fn() }));

const FAST = { iterations: 1000 };
const text = (s) => new TextEncoder().encode(s);
const fixture = () => {
  const bytes = readFileSync(join(process.cwd(), 'src/features/quiz-launcher/__fixtures__/ac-circuits.quiz'));
  return new File([bytes], 'ac-circuits.quiz');
};
const readBlob = async (blob) => new Uint8Array(await blob.arrayBuffer());

beforeEach(() => {
  idb.__data.clear();
  localStorage.clear();
  __resetQuizSession();
});

describe('storedZip', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(text('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it('writes a real ZIP that another tool can read', async () => {
    const w = new ZipWriter();
    w.add('a.txt', text('hello'));
    w.add('dir/ñ.bin', new Uint8Array([0, 255, 1]));
    const out = unzipSync(await readBlob(w.finish()));
    expect(new TextDecoder().decode(out['a.txt'])).toBe('hello');
    expect([...out['dir/ñ.bin']]).toEqual([0, 255, 1]);
  });

  it('reads back what it wrote, by name, without reading the rest', async () => {
    const w = new ZipWriter();
    w.add('one', text('first'));
    w.add('two', text('second'));
    const zip = await readZip(w.finish());
    expect(zip.names()).toEqual(['one', 'two']);
    expect(new TextDecoder().decode(await zip.read('two'))).toBe('second');
    expect(zip.has('three')).toBe(false);
  });

  it('holds an empty entry', async () => {
    const w = new ZipWriter();
    w.add('empty', new Uint8Array());
    expect((await (await readZip(w.finish())).read('empty')).length).toBe(0);
  });

  it('says so for what isn’t a ZIP', async () => {
    await expect(readZip(new Blob(['not a zip at all']))).rejects.toMatchObject({ code: 'not-backup' });
    await expect(readZip(new Blob([]))).rejects.toMatchObject({ code: 'not-backup' });
  });

  it('catches a flipped byte', async () => {
    const w = new ZipWriter();
    w.add('one', text('some content here'));
    const bytes = await readBlob(w.finish());
    bytes[40] ^= 0xff;
    const zip = await readZip(new Blob([bytes]));
    await expect(zip.read('one')).rejects.toMatchObject({ code: 'corrupt' });
  });

  it('catches a file cut short', async () => {
    const w = new ZipWriter();
    w.add('one', text('some content here'));
    const bytes = await readBlob(w.finish());
    await expect(readZip(new Blob([bytes.slice(0, 20)]))).rejects.toBeInstanceOf(BackupError);
  });
});

async function fill(uid = 'u1') {
  await addDeviceFile(uid, new File(['Ohm’s law'], 'notes.txt', { type: 'text/plain' }), { name: 'notes.txt', kind: 'text' });
  await addDeviceFile(uid, new Blob(['%PDF-handout'], { type: 'application/pdf' }), { name: 'AC notes', kind: 'pdf', source: { kind: 'handout', materialId: 'm1', url: 'u' } });
  addQuizFiles(uid, [fixture()]);
  await vi.waitFor(async () => expect(await listQuizzes(uid)).toHaveLength(1));
  const [quiz] = await listQuizzes(uid);
  await recordAttempt(uid, quiz.id, { at: 100, pct: 50 });
  await saveRun(uid, quiz.id, { items: [], answers: { q: 'a' }, finished: false, startedAt: 1 });
  localStorage.setItem('ree:units', '{"favourites":[]}');
  return quiz.id;
}

const fresh = () => {
  idb.__data.clear();
  localStorage.clear();
  __resetQuizSession();
};

describe('a backup, there and back', () => {
  it('measures what there is', async () => {
    await fill();
    expect(await measureBackup('u1')).toMatchObject({ ownCount: 1, handoutCount: 1, quizCount: 1, ownBytes: 11 });
  });

  it('restores files, quizzes, scores, a run and settings onto an empty device', async () => {
    const quizId = await fill();
    const blob = await buildBackup('u1', { email: 'a@b.c', includeHandouts: true });
    fresh();
    const handle = await unlockBackup(await openBackup(blob));
    expect(handle.index).toMatchObject({ uid: 'u1', email: 'a@b.c' });
    const preview = await previewDevice('u1', handle);
    expect(preview.newFiles).toHaveLength(2);
    expect(preview.newQuizzes).toHaveLength(1);
    const result = await restoreDevice('u1', handle);
    expect(result).toMatchObject({ files: 2, quizzes: 1, settings: 1 });
    const files = await listDeviceFiles('u1');
    expect(files.map((f) => f.name).sort()).toEqual(['AC notes', 'notes.txt']);
    const notes = files.find((f) => f.name === 'notes.txt');
    expect(await (await getDeviceFileBlob('u1', notes.id)).text()).toBe('Ohm’s law');
    const [quiz] = await listQuizzes('u1');
    expect(quiz.id).toBe(quizId);
    expect(quiz.result.questions).toHaveLength(36);
    expect(await getAttempts('u1', quizId)).toEqual([{ at: 100, pct: 50 }]);
    expect((await getRun('u1', quizId)).answers).toEqual({ q: 'a' });
    expect(localStorage.getItem('ree:units')).toBe('{"favourites":[]}');
  });

  it('brings folders back, with each file in its own', async () => {
    const folder = await createDeviceFolder('u1', 'Terms');
    await addDeviceFile('u1', new Blob(['x'], { type: 'text/plain' }), { name: 'in.txt', kind: 'text', folderId: folder.id });
    const handle = await unlockBackup(await openBackup(await buildBackup('u1', {})));
    fresh();
    await restoreDevice('u1', handle);
    expect(await listDeviceFolders('u1')).toEqual([folder]);
    expect((await listDeviceFiles('u1'))[0].folderId).toBe(folder.id);
  });

  it('a backup from before folders restores, with its files at the top level', async () => {
    await fill();
    const handle = await unlockBackup(await openBackup(await buildBackup('u1', {})));
    delete handle.index.folders;
    fresh();
    expect(await restoreDevice('u1', handle)).toMatchObject({ files: 1 });
    expect(await listDeviceFolders('u1')).toEqual([]);
  });

  it('leaves saved handouts out unless asked', async () => {
    await fill();
    const handle = await unlockBackup(await openBackup(await buildBackup('u1', {})));
    expect(handle.index.files.map((f) => f.name)).toEqual(['notes.txt']);
  });

  it('a large file goes in pieces and comes back whole', async () => {
    const big = new Uint8Array(20 * 1024 * 1024);
    for (let i = 0; i < big.length; i += 4099) big[i] = i % 251;
    await addDeviceFile('u1', new Blob([big]), { name: 'big.pdf', kind: 'pdf' });
    const blob = await buildBackup('u1', {});
    const opened = await openBackup(blob);
    const handle = await unlockBackup(opened);
    expect(handle.index.files[0].parts).toBe(3);
    fresh();
    await restoreDevice('u1', handle);
    const [meta] = await listDeviceFiles('u1');
    const back = await readBlob(await getDeviceFileBlob('u1', meta.id));
    expect(back.length).toBe(big.length);
    expect(back[4099]).toBe(big[4099]);
    expect(back[big.length - 1]).toBe(big[big.length - 1]);
  });

  it('restoring twice changes nothing the second time', async () => {
    const quizId = await fill();
    const handle = await unlockBackup(await openBackup(await buildBackup('u1', { includeHandouts: true })));
    await restoreDevice('u1', handle);
    expect(await listDeviceFiles('u1')).toHaveLength(2);
    expect(await getAttempts('u1', quizId)).toHaveLength(1);
    const preview = await previewDevice('u1', handle);
    expect(preview.newFiles).toHaveLength(0);
    expect(preview.filesHere).toBe(2);
  });

  it('never overwrites: a renamed file, a newer run and a newer setting stay', async () => {
    const quizId = await fill();
    const blob = await buildBackup('u1', {});
    const [own] = (await listDeviceFiles('u1')).filter((f) => f.name === 'notes.txt');
    const { renameDeviceFile } = await import('../../services/deviceFiles');
    await renameDeviceFile('u1', own.id, 'renamed.txt');
    await saveRun('u1', quizId, { items: [], answers: { q: 'newer' }, finished: false, startedAt: 2 });
    await recordAttempt('u1', quizId, { at: 200, pct: 90 });
    localStorage.setItem('ree:units', 'newer');
    await restoreDevice('u1', await unlockBackup(await openBackup(blob)));
    expect((await listDeviceFiles('u1')).some((f) => f.name === 'renamed.txt')).toBe(true);
    expect((await getRun('u1', quizId)).answers).toEqual({ q: 'newer' });
    expect((await getAttempts('u1', quizId)).map((a) => a.at)).toEqual([100, 200]);
    expect(localStorage.getItem('ree:units')).toBe('newer');
  });

  it('refuses settings it doesn’t know, from a tampered file', async () => {
    await fill();
    const handle = await unlockBackup(await openBackup(await buildBackup('u1', {})));
    fresh();
    handle.index.settings = { 'ree_sim_cache': 'evil', 'ree:units': 'ok' };
    await restoreDevice('u1', handle);
    expect(localStorage.getItem('ree_sim_cache')).toBeNull();
    expect(localStorage.getItem('ree:units')).toBe('ok');
  });

  it('holds your account’s records when it has them', async () => {
    const account = { user: { id: 'u1' }, rows: { notes: [{ targetType: 'question', targetId: 'q', body: 'n' }] } };
    const handle = await unlockBackup(await openBackup(await buildBackup('u1', { account })));
    expect(await handle.readAccount()).toEqual(account);
  });

  it('works offline, with no account records', async () => {
    const handle = await unlockBackup(await openBackup(await buildBackup('u1', {})));
    expect(await handle.readAccount()).toBeNull();
  });

  it('checks for room before writing anything', async () => {
    await fill();
    const handle = await unlockBackup(await openBackup(await buildBackup('u1', {})));
    fresh();
    Object.defineProperty(navigator, 'storage', { configurable: true, value: { estimate: async () => ({ usage: 10, quota: 10 }) } });
    await expect(restoreDevice('u1', handle)).rejects.toThrow('This needs');
    expect(await listDeviceFiles('u1')).toEqual([]);
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined });
  });

  it('names the file by date', () => {
    expect(backupFileName(new Date('2026-11-04T10:00:00Z'))).toBe('ree-backup-2026-11-04.reebak');
  });
});

describe('with a passphrase', () => {
  it('round-trips', async () => {
    const quizId = await fill();
    const blob = await buildBackup('u1', { passphrase: 'correct horse', includeHandouts: true, ...FAST });
    fresh();
    const opened = await openBackup(blob);
    expect(opened.manifest.encrypted).toBe(true);
    const handle = await unlockBackup(opened, 'correct horse');
    await restoreDevice('u1', handle);
    expect(await listDeviceFiles('u1')).toHaveLength(2);
    expect(await getAttempts('u1', quizId)).toHaveLength(1);
  });

  it('uses OWASP’s rounds by default, and says so in the manifest', async () => {
    const { PBKDF2_ITERATIONS } = await import('./backupFile');
    expect(PBKDF2_ITERATIONS).toBe(600000);
  });

  it('refuses a wrong passphrase, and a missing one, in plain words', async () => {
    await fill();
    const opened = await openBackup(await buildBackup('u1', { passphrase: 'right', ...FAST }));
    await expect(unlockBackup(opened, 'wrong')).rejects.toMatchObject({ code: 'wrong-passphrase', message: 'That passphrase isn’t right.' });
    await expect(unlockBackup(opened, '')).rejects.toMatchObject({ code: 'wrong-passphrase' });
  });

  it('nothing readable is left in the file: not a name, a score or a note', async () => {
    await fill();
    const account = { rows: { notes: [{ body: 'my secret note' }] } };
    const bytes = await readBlob(await buildBackup('u1', { passphrase: 'p', account, email: 'someone@example.com', ...FAST }));
    const raw = new TextDecoder('latin1').decode(bytes);
    for (const secret of ['Ohm', 'notes.txt', 'ac-circuits', 'secret note', 'someone@example.com', 'favourites']) {
      expect(raw.includes(secret), secret).toBe(false);
    }
  });

  it('without one, it’s plainly readable, which the screen warns about', async () => {
    await fill();
    const bytes = await readBlob(await buildBackup('u1', {}));
    expect(new TextDecoder('latin1').decode(bytes)).toContain('notes.txt');
  });

  it('a piece moved to another name fails, rather than restoring the wrong bytes', async () => {
    await addDeviceFile('u1', new Blob(['aaa']), { name: 'a.txt', kind: 'text' });
    await addDeviceFile('u1', new Blob(['bbb']), { name: 'b.txt', kind: 'text' });
    const opened = await openBackup(await buildBackup('u1', { passphrase: 'p', ...FAST }));
    const handle = await unlockBackup(opened, 'p');
    const [one, two] = handle.index.files;
    const realRead = opened.zip.read;
    opened.zip.read = (name) => realRead(name === `data/files/${one.id}/0` ? `data/files/${two.id}/0` : name);
    await expect(handle.blobOf('files', one.id, 1, '')).rejects.toMatchObject({ code: 'corrupt' });
  });
});

describe('bad files', () => {
  it('a plain ZIP someone renamed', async () => {
    const w = new ZipWriter();
    w.add('readme.txt', text('hello'));
    await expect(openBackup(w.finish())).rejects.toMatchObject({ code: 'not-backup', message: 'That isn’t a backup from this app.' });
  });

  it('a quiz file', async () => {
    await expect(openBackup(fixture())).rejects.toBeInstanceOf(BackupError);
  });

  it('another app’s manifest', async () => {
    const w = new ZipWriter();
    w.add('manifest.json', text('{"format":"other"}'));
    await expect(openBackup(w.finish())).rejects.toMatchObject({ code: 'not-backup' });
  });

  it('one from a newer app says to reload', async () => {
    const w = new ZipWriter();
    w.add('manifest.json', text('{"format":"ree-backup","version":99}'));
    await expect(openBackup(w.finish())).rejects.toMatchObject({ code: 'newer' });
  });

  it('one with a damaged piece stops, and what’s restored stays', async () => {
    await fill();
    const blob = await buildBackup('u1', {});
    const bytes = await readBlob(blob);
    const handle = await unlockBackup(await openBackup(new Blob([bytes])));
    const name = `data/quizzes/${handle.index.quizzes[0].id}/0`;
    const zipView = await readZip(new Blob([bytes]));
    expect(zipView.has(name)).toBe(true);
    const at = new TextDecoder('latin1').decode(bytes).indexOf(name);
    bytes[at + name.length + 40] ^= 0xff;
    fresh();
    const damaged = await unlockBackup(await openBackup(new Blob([bytes])));
    await expect(restoreDevice('u1', damaged)).rejects.toMatchObject({ code: 'corrupt' });
    expect(await listDeviceFiles('u1')).toHaveLength(1);
  });
});

describe('your records', () => {
  const backup = {
    user: { drawPrefs: { drawMode: 'board' } },
    rows: {
      notes: [{ targetType: 'question', targetId: 'q1', body: 'old' }, { targetType: 'card', targetId: 'c1', body: 'kept' }],
      syllabus: [{ topicId: 't1', read: true, watched: false, drilled: false }],
      mistakes: [{ questionId: 'q9', cause: 'careless', resolvedAt: '2026-01-01' }],
      subtopics: [{ id: 's1', topicId: 't1', name: 'Mine' }],
      practiceSets: [{ id: 'p1', title: 'Set' }],
      links: [{ id: 'l1', title: 'Link' }, { id: 'l2', title: 'Other' }],
      keyDates: [{ id: 'k1', title: 'Mock' }],
      outsideScores: [{ id: 'retest', retestOfId: 'first' }, { id: 'first', retestOfId: null }],
      attempts: [{ id: 'a1', questionId: 'q1', isCorrect: true }],
      topicPerformance: [{ id: 't', mastery: 0.9 }],
      thetaHistory: [{ theta: 3 }],
    },
  };

  it('plans only what’s missing', () => {
    const current = { user: {}, rows: { notes: [{ targetType: 'question', targetId: 'q1', body: 'newer' }], links: [{ id: 'l1' }] } };
    const { kinds, ops } = planAccountRestore(backup, current);
    expect(kinds.find((k) => k.key === 'notes')).toEqual({ key: 'notes', label: 'Notes', add: 1, already: 1 });
    expect(kinds.find((k) => k.key === 'links')).toMatchObject({ add: 1, already: 1 });
    expect(ops.some((o) => o.url === '/api/user/notes/question/q1')).toBe(false);
    expect(ops.find((o) => o.url === '/api/user/notes/card/c1').body).toEqual({ body: 'kept' });
  });

  it('never plans a graded answer or a rating, whatever the file says', () => {
    const { kinds, ops } = planAccountRestore(backup, { user: {}, rows: {} });
    const urls = ops.map((o) => o.url).join(' ');
    expect(urls).not.toMatch(/attempt|exam|analytics|theta|readiness|leaderboard|grade|srs|battle/);
    expect(kinds.map((k) => k.key)).toEqual(['notes', 'syllabus', 'subtopics', 'mistakes', 'practiceSets', 'links', 'keyDates', 'outsideScores', 'drawPrefs']);
  });

  it('a score goes back before the retest that points at it', () => {
    const { ops } = planAccountRestore(backup, { rows: {} });
    expect(ops.filter((o) => o.kind === 'Outside scores').map((o) => o.body.id)).toEqual(['first', 'retest']);
  });

  it('turns a resolved mark into what the route takes', () => {
    const { ops } = planAccountRestore(backup, { rows: {} });
    expect(ops.find((o) => o.url === '/api/user/mistakes/q9').body).toEqual({ cause: 'careless', resolved: true });
  });

  it('keeps your current way of picking mocks', () => {
    const { ops } = planAccountRestore(backup, { user: { drawPrefs: { drawMode: 'own' } }, rows: {} });
    expect(ops.some((o) => o.url === '/api/user/draw-prefs')).toBe(false);
  });

  it('a second run has nothing to do', () => {
    const { kinds, ops } = planAccountRestore(backup, backup);
    expect(ops).toEqual([]);
    expect(kinds.every((k) => k.add === 0)).toBe(true);
  });

  it('a record the server refuses is counted, and the rest carry on', async () => {
    const request = vi.fn(async (url) => { if (url === '/b') throw new Error('Question not found.'); });
    const out = await runAccountRestore([{ kind: 'Notes', method: 'PUT', url: '/a' }, { kind: 'Notes', method: 'PUT', url: '/b' }, { kind: 'Links', method: 'POST', url: '/c' }], { request });
    expect(out).toEqual({ added: 2, failed: [{ kind: 'Notes', reason: 'Question not found.' }], stopped: false });
  });

  it('losing the connection stops it, so it can run again', async () => {
    const request = vi.fn(async (url) => { if (url === '/b') throw new Error('[OFFLINE]'); });
    const out = await runAccountRestore([{ url: '/a' }, { url: '/b' }, { url: '/c' }], { request });
    expect(out).toMatchObject({ added: 1, stopped: true });
    expect(request).toHaveBeenCalledTimes(2);
  });
});

it('refreshQuizzes survives an empty store', async () => {
  await expect(refreshQuizzes('nobody')).resolves.toBeUndefined();
});
