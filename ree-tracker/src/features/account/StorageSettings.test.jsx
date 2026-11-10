// src/features/account/StorageSettings.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import * as idb from 'idb-keyval';
import { addDeviceFile } from '../../services/deviceFiles';
import StorageSettings from './StorageSettings';

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
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));
// The pack's size comes from its summary; the pack itself isn't read.
vi.mock('../../services/offlinePack', () => ({ getOfflinePackMeta: async () => ({ exists: true, bytes: 106 }) }));

let persisted;
const persist = vi.fn(async () => { persisted = true; return true; });
const setStorage = (over = {}) => Object.defineProperty(navigator, 'storage', {
  configurable: true,
  value: { estimate: async () => ({ usage: 50 * 1024 * 1024, quota: 1024 * 1024 * 1024 }), persisted: async () => persisted, persist, ...over },
});

beforeEach(() => {
  idb.__data.clear();
  persisted = false;
  persist.mockClear();
  setStorage();
});

describe('Storage', () => {
  it('splits out what’s on the device', async () => {
    await addDeviceFile('u1', new Blob(['a'.repeat(2048)]), { name: 'mine', kind: 'text' });
    await addDeviceFile('u1', new Blob(['a'.repeat(1024)]), { name: 'h', kind: 'pdf', source: { kind: 'handout', materialId: 'm', url: 'u' } });
    idb.__data.set('u1:quiz:file:1', { file: new Blob(['q'.repeat(512)]) });
    render(<StorageSettings />);
    const list = await screen.findByRole('list', { name: 'What’s using it' });
    expect(within(list).getByText('My files (1)').parentElement).toHaveTextContent('2.0 KB');
    expect(within(list).getByText('Saved handouts (1)').parentElement).toHaveTextContent('1.0 KB');
    expect(within(list).getByText('Imported quizzes (1)').parentElement).toHaveTextContent('512 B');
    expect(within(list).getByText('Question pack').parentElement).toHaveTextContent('106 B');
    expect(within(list).getByText('The app and everything else').parentElement).toHaveTextContent('50.0 MB');
    expect(screen.getByText(/50\.0 MB used of the 1\.00 GB/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Storage used' })).toBeInTheDocument();
  });

  it('another account’s files aren’t counted', async () => {
    await addDeviceFile('u2', new Blob(['a'.repeat(2048)]), { name: 'theirs', kind: 'text' });
    render(<StorageSettings />);
    const list = await screen.findByRole('list', { name: 'What’s using it' });
    expect(within(list).getByText('My files').parentElement).toHaveTextContent('0 B');
  });

  it('says when it isn’t protected, and can ask', async () => {
    render(<StorageSettings />);
    expect(await screen.findByText('Not protected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ask the browser to protect it' }));
    expect(await screen.findByText('Protected')).toBeInTheDocument();
    expect(persist).toHaveBeenCalled();
  });

  it('says when the browser refuses', async () => {
    setStorage({ persist: vi.fn(async () => false) });
    render(<StorageSettings />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ask the browser to protect it' }));
    expect(await screen.findByRole('status')).toHaveTextContent('The browser said no for now');
  });

  it('copes with a browser that won’t say anything', async () => {
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined });
    render(<StorageSettings />);
    expect(await screen.findByText('This browser doesn’t say how much it allows.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('on an iPhone not installed, says how to stop Safari clearing it', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone');
    render(<StorageSettings />);
    expect(await screen.findByText(/Safari can clear data after seven days/)).toBeInTheDocument();
    ua.mockRestore();
  });

  it('says plainly where each kind of data lives, and what isn’t encrypted', async () => {
    render(<StorageSettings />);
    const where = await screen.findByRole('list', { name: 'Where your data lives' });
    expect(within(where).getByText('My files').parentElement).toHaveTextContent('This device only');
    expect(within(where).getByText('Answers, ratings, notes, plans').parentElement).toHaveTextContent('Your account');
    expect(screen.getByText(/doesn’t encrypt/)).toBeInTheDocument();
  });
});
