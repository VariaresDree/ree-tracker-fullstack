// src/features/backup/BackupSettings.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import * as idb from 'idb-keyval';
import { apiRequest } from '../../services/dbQueries';
import { addDeviceFile, listDeviceFiles } from '../../services/deviceFiles';
import { canDownloadFiles, downloadBlob } from '../exam-export/deliver';
import { __resetQuizSession } from '../quiz-launcher/quizSession';
import { buildBackup } from './backupFile';
import BackupSettings from './BackupSettings';

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
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1', email: 'me@example.com' } }) }));
vi.mock('../../services/dbQueries', () => ({ apiRequest: vi.fn() }));
vi.mock('../exam-export/deliver', () => ({ canDownloadFiles: vi.fn(() => true), downloadBlob: vi.fn() }));

const account = (over = {}) => ({ exportedAt: 'now', user: { id: 'u1' }, rows: { notes: [{ targetType: 'question', targetId: 'q1', body: 'note' }], attempts: [{ id: 'a' }], ...over } });
const pickBackup = (file) => fireEvent.change(document.querySelector('input[accept=".reebak"]'), { target: { files: [file] } });

beforeEach(() => {
  idb.__data.clear();
  localStorage.clear();
  __resetQuizSession();
  downloadBlob.mockClear();
  canDownloadFiles.mockReturnValue(true);
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (url) => (url === '/api/user/export' ? account() : { item: {} }));
});

describe('Downloading a backup', () => {
  it('asks the server for your records, and saves one file', async () => {
    await addDeviceFile('u1', new File(['x'], 'a.txt', { type: 'text/plain' }), { name: 'a.txt', kind: 'text' });
    render(<BackupSettings />);
    expect(await screen.findByText(/1 file from My files/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Download a backup/ }));
    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1));
    expect(downloadBlob.mock.calls[0][1]).toMatch(/^ree-backup-\d{4}-\d{2}-\d{2}\.reebak$/);
    expect(apiRequest).toHaveBeenCalledWith('/api/user/export', 'GET', null, expect.anything());
    expect(await screen.findByText(/It isn’t encrypted/)).toBeInTheDocument();
  });

  it('offline, it still makes one, and says what’s missing', async () => {
    apiRequest.mockRejectedValue(new Error('[OFFLINE]'));
    render(<BackupSettings />);
    fireEvent.click(await screen.findByRole('button', { name: /Download a backup/ }));
    expect(await screen.findByText(/has only what’s on this device/)).toBeInTheDocument();
    expect(downloadBlob).toHaveBeenCalledTimes(1);
  });

  it('a passphrase has to match, and says it can’t be recovered', async () => {
    render(<BackupSettings />);
    expect(await screen.findByText(/nobody can open this backup/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Passphrase \(optional\)/), { target: { value: 'one' } });
    fireEvent.change(screen.getByLabelText('Passphrase again'), { target: { value: 'two' } });
    expect(screen.getByText('These don’t match.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download a backup/ })).toBeDisabled();
  });

  it('saved handouts stay out unless ticked', async () => {
    await addDeviceFile('u1', new Blob(['%PDF-'], { type: 'application/pdf' }), { name: 'H', kind: 'pdf', source: { kind: 'handout', materialId: 'm', url: 'u' } });
    render(<BackupSettings />);
    const tick = await screen.findByRole('checkbox', { name: /Include saved handouts/ });
    expect(tick).not.toBeChecked();
  });

  it('the Android app says where to do it instead', () => {
    canDownloadFiles.mockReturnValue(false);
    render(<BackupSettings />);
    expect(screen.getByText(/open this page in a browser/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download a backup/ })).toBeNull();
  });
});

describe('Restoring', () => {
  const makeFile = async (options = {}) => {
    await addDeviceFile(options.uid || 'u1', new File(['x'], 'a.txt', { type: 'text/plain' }), { name: 'a.txt', kind: 'text' });
    const blob = await buildBackup(options.uid || 'u1', { account: account(), iterations: 1000, ...options });
    idb.__data.clear();
    return blob;
  };

  it('shows what it would do before anything changes', async () => {
    const blob = await makeFile();
    apiRequest.mockImplementation(async (url) => (url === '/api/user/export' ? account({ notes: [] }) : {}));
    render(<BackupSettings />);
    pickBackup(blob);
    expect(await screen.findByText('1 file to add')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Your records' })).getByText('Notes: 1 to add')).toBeInTheDocument();
    expect(screen.getByText(/never restored: only the server grades answers/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing here is overwritten/)).toBeInTheDocument();
    expect(await listDeviceFiles('u1')).toEqual([]);
    expect(apiRequest.mock.calls.filter(([, method]) => method !== 'GET')).toEqual([]);
  });

  it('then adds what’s missing', async () => {
    const blob = await makeFile();
    apiRequest.mockImplementation(async (url) => (url === '/api/user/export' ? account({ notes: [] }) : {}));
    render(<BackupSettings />);
    pickBackup(blob);
    fireEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    expect(await screen.findByText('Restored 1 file and 0 quizzes, and 1 record.')).toBeInTheDocument();
    expect(await listDeviceFiles('u1')).toHaveLength(1);
    expect(apiRequest).toHaveBeenCalledWith('/api/user/notes/question/q1', 'PUT', { body: 'note' }, expect.anything());
  });

  it('nothing to do leaves nothing to press', async () => {
    const blob = await makeFile();
    await addDeviceFile('u1', new File(['x'], 'other.txt'), { name: 'other.txt', kind: 'text' });
    const backupWithNothing = await buildBackup('u9', { account: null, iterations: 1000 });
    render(<BackupSettings />);
    pickBackup(backupWithNothing);
    expect(await screen.findByRole('button', { name: 'Restore' })).toBeDisabled();
    expect(blob.size).toBeGreaterThan(0);
  });

  it('asks for the passphrase, and says when it’s wrong', async () => {
    const blob = await makeFile({ passphrase: 'right' });
    render(<BackupSettings />);
    pickBackup(blob);
    const field = await screen.findByLabelText('This backup’s passphrase');
    fireEvent.change(field, { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /Open/ }));
    expect(await screen.findByText('That passphrase isn’t right.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('This backup’s passphrase'), { target: { value: 'right' } });
    fireEvent.click(screen.getByRole('button', { name: /Open/ }));
    expect(await screen.findByText('1 file to add')).toBeInTheDocument();
  });

  it('another account’s backup can’t touch your records', async () => {
    const blob = await makeFile({ uid: 'someone-else', email: 'them@example.com' });
    render(<BackupSettings />);
    pickBackup(blob);
    expect(await screen.findByText('Another account')).toBeInTheDocument();
    expect(screen.getByText(/It’s from them@example.com/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Your records' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    await screen.findByText(/Restored 1 file/);
    expect(apiRequest.mock.calls.filter(([, method]) => method !== 'GET')).toEqual([]);
  });

  it('offline, files still come back, and it says what doesn’t', async () => {
    const blob = await makeFile();
    apiRequest.mockRejectedValue(new Error('[OFFLINE]'));
    render(<BackupSettings />);
    pickBackup(blob);
    expect(await screen.findByText(/can’t be compared while you’re offline/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(await screen.findByText(/Restored 1 file/)).toBeInTheDocument();
  });

  it('a file that isn’t a backup says so', async () => {
    render(<BackupSettings />);
    pickBackup(new File(['not a zip'], 'x.reebak'));
    expect(await screen.findByRole('alert')).toHaveTextContent('That isn’t a backup from this app.');
  });

  it('a full disk says so, and how to carry on', async () => {
    const blob = await makeFile();
    render(<BackupSettings />);
    pickBackup(blob);
    const button = await screen.findByRole('button', { name: 'Restore' });
    Object.defineProperty(navigator, 'storage', { configurable: true, value: { estimate: async () => ({ usage: 0, quota: 0 }) } });
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('This needs');
    expect(screen.getByRole('alert')).toHaveTextContent('running it again picks up the rest');
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined });
  });

  it('reports a record the server wouldn’t take', async () => {
    const blob = await makeFile();
    apiRequest.mockImplementation(async (url) => {
      if (url === '/api/user/export') return account({ notes: [] });
      throw new Error('Question not found.');
    });
    render(<BackupSettings />);
    pickBackup(blob);
    fireEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    expect(await screen.findByText('Notes: Question not found.')).toBeInTheDocument();
  });
});
