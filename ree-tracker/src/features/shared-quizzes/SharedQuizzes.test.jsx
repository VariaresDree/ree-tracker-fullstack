// src/features/shared-quizzes/SharedQuizzes.test.jsx
//
// A real quiz file, downloaded from a stubbed server through the real tab: the
// tile, the device copy, the setup sheet, Update available.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import process from 'node:process';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as idb from 'idb-keyval';
import { apiRequest } from '../../services/dbQueries';
import { downloadBlob } from '../exam-export/deliver';
import QuizLauncherTab from '../quiz-launcher/QuizLauncherTab';
import { __resetQuizSession } from '../quiz-launcher/quizSession';
import { recordAttempt, saveRun, getAttempts, getRun } from '../quiz-launcher/quizStore';
import { __resetQuizFileCache } from './quizFilesApi';
import SharedQuizzes from './SharedQuizzes';
import { bySubject, deviceFileName, deviceIdOf, formatSize, sharedState } from './sharedState';

vi.mock('idb-keyval', () => {
  const data = new Map();
  return {
    __data: data,
    createStore: () => 'store',
    get: vi.fn(async (k) => data.get(k)),
    set: vi.fn(async (k, v) => { data.set(k, v); }),
    del: vi.fn(async (k) => { data.delete(k); }),
    keys: vi.fn(async () => [...data.keys()]),
    getMany: vi.fn(async (ks) => ks.map((k) => data.get(k))),
  };
});
vi.mock('../../services/dbQueries', () => ({ apiRequest: vi.fn() }));
vi.mock('../exam-export/deliver', () => ({ canDownloadFiles: () => true, downloadBlob: vi.fn() }));

const fixture = (name) => {
  const bytes = readFileSync(join(process.cwd(), 'src/features/quiz-launcher/__fixtures__', name));
  return { buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), checksum: createHash('sha256').update(bytes).digest('hex'), size: bytes.length };
};
const AC = fixture('ac-circuits.quiz');
const ALT = fixture('alternators.quiz');
const shared = (over = {}) => ({
  id: 'f1',
  name: 'AC circuits set 1',
  fileName: 'ac-circuits.quiz',
  subject: 'EE',
  description: 'From the coaching notes',
  sizeBytes: AC.size,
  questionCount: 36,
  skippedCount: 0,
  checksum: AC.checksum,
  ...over,
});

let server;
beforeEach(() => {
  idb.__data.clear();
  localStorage.clear();
  __resetQuizSession();
  __resetQuizFileCache();
  downloadBlob.mockClear();
  server = { list: [shared()], file: AC.buffer };
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (endpoint) => {
    if (server.listError) throw server.listError;
    if (endpoint === '/api/quiz-files') return { items: server.list };
    if (server.fileError) throw server.fileError;
    return server.file;
  });
});

const renderTab = () => render(
  <MemoryRouter initialEntries={['/library?tab=quizzes']}>
    <QuizLauncherTab shared={<SharedQuizzes />} />
  </MemoryRouter>,
);
const download = async (name = 'AC circuits set 1') => fireEvent.click(await screen.findByRole('button', { name: `Download ${name}` }));

describe('Shared quizzes', () => {
  it('shows nothing when nothing is shared', async () => {
    server.list = [];
    renderTab();
    await waitFor(() => expect(apiRequest).toHaveBeenCalled());
    await screen.findByText('No quizzes yet');
    expect(screen.queryByText('Shared quizzes')).toBeNull();
  });

  it('shows nothing before the server has the route', async () => {
    server.listError = Object.assign(new Error('Not found.'), { status: 404 });
    renderTab();
    await screen.findByText('No quizzes yet');
    await waitFor(() => expect(apiRequest).toHaveBeenCalled());
    expect(screen.queryByText(/Shared quizzes/)).toBeNull();
  });

  it('says so offline, without hiding what’s on the device', async () => {
    server.listError = new Error('[OFFLINE]');
    renderTab();
    expect(await screen.findByText(/Shared quizzes need a connection/)).toBeInTheDocument();
  });

  it('a failed list can be tried again', async () => {
    server.listError = new Error('Couldn’t load the shared quizzes.');
    renderTab();
    const again = await screen.findByRole('button', { name: 'Try again' });
    server.listError = null;
    fireEvent.click(again);
    expect(await screen.findByRole('button', { name: 'Download AC circuits set 1' })).toBeInTheDocument();
  });

  it('lists them by subject with their count and size, without downloading any', async () => {
    server.list = [shared(), shared({ id: 'f2', name: 'Stats', subject: 'Mathematics', checksum: ALT.checksum }), shared({ id: 'f3', name: 'Misc', subject: null, checksum: 'c'.repeat(64) })];
    renderTab();
    const math = await screen.findByRole('list', { name: 'Mathematics' });
    expect(within(math).getByText('Stats')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'EE' })).toHaveTextContent(`36 questions · ${formatSize(AC.size)}`);
    expect(screen.getAllByText('From the coaching notes')).toHaveLength(3);
    expect(apiRequest.mock.calls.filter(([endpoint]) => endpoint.endsWith('/file'))).toEqual([]);
  });

  it('Download keeps it on the device among your quizzes, under its shared name', async () => {
    renderTab();
    await download();
    expect(await screen.findByText('On this device')).toBeInTheDocument();
    expect(await screen.findByText('AC circuits set 1.quiz')).toBeInTheDocument();
    expect(screen.getByText(/36 questions loaded/)).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/api/quiz-files/f1/file', 'GET', null, expect.objectContaining({ asBuffer: true }));
    expect(idb.__data.get(`local:quiz:file:${deviceIdOf(shared())}`).shared).toEqual({ id: 'f1', checksum: AC.checksum });
  });

  it('Start opens the same setup sheet', async () => {
    renderTab();
    await download();
    fireEvent.click(await screen.findByRole('button', { name: 'Start AC circuits set 1' }));
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByRole('radio', { name: 'Exam' })).toBeInTheDocument();
  });

  it('a file you already added shows as on this device', async () => {
    renderTab();
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [new File([AC.buffer], 'mine.quiz')] } });
    expect(await screen.findByText('On this device')).toBeInTheDocument();
  });

  it('a changed file shows Update available; updating keeps scores and drops the old run', async () => {
    const view = renderTab();
    await download();
    await screen.findByText('On this device');
    const oldId = deviceIdOf(shared());
    await recordAttempt(undefined, oldId, { at: 1, pct: 50 });
    await saveRun(undefined, oldId, { items: [], answers: {}, finished: false });
    view.unmount();
    __resetQuizSession();
    __resetQuizFileCache();

    server.list = [shared({ checksum: ALT.checksum, sizeBytes: ALT.size, questionCount: 49 })];
    server.file = ALT.buffer;
    renderTab();
    expect(await screen.findByText('Update available')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update AC circuits set 1' }));
    expect(await screen.findByText('On this device')).toBeInTheDocument();
    expect(await screen.findByText(/49 questions loaded/)).toBeInTheDocument();
    expect(screen.queryByText(/36 questions loaded/)).toBeNull();
    const newId = ALT.checksum.slice(0, 32);
    expect(await getAttempts(undefined, newId)).toEqual([{ at: 1, pct: 50 }]);
    expect(await getRun(undefined, newId)).toBeUndefined();
    expect(idb.__data.has(`local:quiz:file:${oldId}`)).toBe(false);
  });

  it('a download that doesn’t match its checksum isn’t kept', async () => {
    server.file = ALT.buffer;
    renderTab();
    await download();
    expect(await screen.findByRole('alert')).toHaveTextContent('didn’t arrive whole');
    expect([...idb.__data.keys()].filter((k) => k.includes(':quiz:file:'))).toEqual([]);
  });

  it('a failed download says why and can be tried again', async () => {
    server.fileError = new Error('[OFFLINE]');
    renderTab();
    await download();
    expect(await screen.findByRole('alert')).toHaveTextContent('You’re offline');
    server.fileError = null;
    await download();
    expect(await screen.findByText('On this device')).toBeInTheDocument();
  });

  it('Save as a file gives the file itself, and doesn’t fetch it twice once it’s here', async () => {
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Save AC circuits set 1 as a file' }));
    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1));
    expect(downloadBlob.mock.calls[0][1]).toBe('AC circuits set 1.quiz');
    expect(screen.queryByText('On this device')).toBeNull();

    await download();
    await screen.findByText('On this device');
    apiRequest.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Save AC circuits set 1 as a file' }));
    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(2));
    expect(apiRequest).not.toHaveBeenCalled();
  });
});

describe('sharedState', () => {
  const ready = (id, extra) => ({ id, status: 'ready', ...extra });
  it('matches by bytes first, then by the shared id for an older version', () => {
    const file = shared();
    expect(sharedState(file, []).kind).toBe('new');
    expect(sharedState(file, [ready(deviceIdOf(file))]).kind).toBe('saved');
    expect(sharedState(file, [ready('old', { shared: { id: 'f1' } })]).kind).toBe('update');
    expect(sharedState(file, [{ id: deviceIdOf(file), status: 'parsing' }]).kind).toBe('new');
  });

  it('names the device copy, once', () => {
    expect(deviceFileName(shared({ name: 'Set 1' }))).toBe('Set 1.quiz');
    expect(deviceFileName(shared({ name: 'Set 1.QUIZ' }))).toBe('Set 1.QUIZ');
    expect(deviceFileName(shared({ name: 'Set 1', fileName: 'a.caq' }))).toBe('Set 1.caq');
  });

  it('groups in the board’s order, with General last', () => {
    const labels = bySubject([{ subject: null }, { subject: 'EE' }, { subject: 'Mathematics' }]).map((g) => g.label);
    expect(labels).toEqual(['Mathematics', 'EE', 'General']);
  });
});
