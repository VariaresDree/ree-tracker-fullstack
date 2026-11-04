// src/features/materials/saveHandout.test.jsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as idb from 'idb-keyval';
import { __resetFilesStore, addFile } from '../my-files/filesStore';
import CloudVaultTab from './CloudVaultTab';
import MaterialViewer from './MaterialViewer';
import { canSaveOffline, downloadHandout } from './saveHandout';
import SaveOffline from './SaveOffline';

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
vi.mock('../../components/PdfCanvasViewer', () => ({ default: ({ title }) => <p>device pdf {title}</p> }));
let hookState;
vi.mock('./useFileManager', () => ({
  useFileManager: () => ({
    folders: [], materials: [], currentFolderId: 'root', breadcrumbs: [{ id: 'root', name: 'Handouts' }], isLoading: false, loadError: null, reload: vi.fn(),
    navigateToFolder: vi.fn(), navigateToBreadcrumb: vi.fn(), revealFolder: vi.fn(), handleDragStart: vi.fn(), handleDragOver: vi.fn(), handleDragLeave: vi.fn(), handleDrop: vi.fn(),
    ...hookState,
  }),
}));

const MATERIAL = { id: 'm1', name: 'AC notes', type: 'pdf', url: 'https://drive.google.com/file/d/abc123/preview', createdAt: '2026-01-01' };
const PDF_BYTES = new TextEncoder().encode('%PDF-1.7 rest of the file');

function drive({ meta = { status: 200, json: { size: String(PDF_BYTES.length), mimeType: 'application/pdf' } }, file = { status: 200, bytes: PDF_BYTES } } = {}) {
  return vi.fn(async (url) => {
    if (url.includes('alt=media')) {
      return new Response(file.bytes, { status: file.status, headers: { 'Content-Length': String(file.bytes?.length || 0) } });
    }
    return new Response(JSON.stringify(meta.json || {}), { status: meta.status });
  });
}

beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_DRIVE_KEY', 'test-key');
  idb.__data.clear();
  __resetFilesStore();
  hookState = {};
  globalThis.fetch = drive();
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.unstubAllEnvs());

describe('canSaveOffline', () => {
  it('needs a key, a PDF and a Drive link', () => {
    expect(canSaveOffline(MATERIAL)).toBe(true);
    expect(canSaveOffline({ ...MATERIAL, type: 'video' })).toBe(false);
    expect(canSaveOffline({ ...MATERIAL, url: 'https://example.com/a.pdf' })).toBe(false);
    vi.stubEnv('VITE_GOOGLE_DRIVE_KEY', '');
    expect(canSaveOffline(MATERIAL)).toBe(false);
  });
});

describe('downloadHandout', () => {
  it('asks Drive’s API with the key, and reports progress', async () => {
    const progress = [];
    const blob = await downloadHandout(MATERIAL, { onProgress: (p) => progress.push(p) });
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBe(PDF_BYTES.length);
    const urls = fetch.mock.calls.map(([u]) => u);
    expect(urls[0]).toBe('https://www.googleapis.com/drive/v3/files/abc123?fields=size,mimeType&key=test-key');
    expect(urls[1]).toBe('https://www.googleapis.com/drive/v3/files/abc123?alt=media&key=test-key');
    expect(progress.at(-1)).toBe(1);
  });

  it.each([
    [403, 'Drive wouldn’t hand this one over'],
    [404, 'Drive says this file is gone'],
    [500, 'Drive didn’t send this file'],
  ])('a %s from Drive says so', async (status, message) => {
    globalThis.fetch = drive({ meta: { status, json: {} } });
    await expect(downloadHandout(MATERIAL)).rejects.toThrow(message);
  });

  it('a refusal on the download itself says so too', async () => {
    globalThis.fetch = drive({ file: { status: 403, bytes: new Uint8Array() } });
    await expect(downloadHandout(MATERIAL)).rejects.toThrow('Drive wouldn’t hand this one over');
  });

  it('refuses what isn’t really a PDF', async () => {
    globalThis.fetch = drive({ file: { status: 200, bytes: new TextEncoder().encode('<html>sign in</html>') } });
    await expect(downloadHandout(MATERIAL)).rejects.toThrow('What Drive sent isn’t a PDF');
  });

  it('a Drive file of another type stops before downloading', async () => {
    globalThis.fetch = drive({ meta: { status: 200, json: { mimeType: 'application/vnd.google-apps.document' } } });
    await expect(downloadHandout(MATERIAL)).rejects.toThrow('isn’t a PDF on Drive');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('a file too big for the device stops before downloading', async () => {
    Object.defineProperty(navigator, 'storage', { configurable: true, value: { estimate: async () => ({ usage: 0, quota: 10 }) } });
    await expect(downloadHandout(MATERIAL)).rejects.toThrow('This needs');
    expect(fetch).toHaveBeenCalledTimes(1);
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined });
  });

  it('no connection says so', async () => {
    globalThis.fetch = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    await expect(downloadHandout(MATERIAL)).rejects.toThrow('Couldn’t reach Drive');
  });
});

describe('The tile’s button', () => {
  const renderIt = (props = {}) => render(<MemoryRouter><SaveOffline material={MATERIAL} uid="u1" {...props} /></MemoryRouter>);

  it('saves it among your files, marked as a handout', async () => {
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: 'Save AC notes for offline' }));
    await waitFor(() => expect([...idb.__data.keys()].filter((k) => k.includes(':file:meta:'))).toHaveLength(1));
    const meta = [...idb.__data.entries()].find(([k]) => k.includes(':file:meta:'))[1];
    expect(meta).toMatchObject({ name: 'AC notes', kind: 'pdf', source: { kind: 'handout', materialId: 'm1', url: MATERIAL.url } });
  });

  it('a failure offers Open in Drive, and My files', async () => {
    globalThis.fetch = drive({ meta: { status: 403, json: {} } });
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: 'Save AC notes for offline' }));
    const dialog = await screen.findByRole('dialog', { name: 'Couldn’t save this handout' });
    expect(within(dialog).getByRole('link', { name: /Open in Drive/ })).toHaveAttribute('href', 'https://drive.google.com/file/d/abc123/view');
    expect(within(dialog).getByRole('link', { name: 'My files' })).toHaveAttribute('href', '/library?tab=files');
    expect(screen.getByRole('button', { name: 'Save AC notes for offline' })).toBeEnabled();
  });

  it('with no key there’s no button', () => {
    vi.stubEnv('VITE_GOOGLE_DRIVE_KEY', '');
    const { container } = renderIt();
    expect(container).toBeEmptyDOMElement();
  });

  it('once saved, it says so', () => {
    renderIt({ saved: true });
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Handouts, with one saved', () => {
  const saved = () => addFile('u1', new Blob(['%PDF-'], { type: 'application/pdf' }), { name: 'AC notes', kind: 'pdf', source: { kind: 'handout', materialId: 'm1', url: MATERIAL.url } });
  const renderTab = () => {
    const onViewMaterial = vi.fn();
    render(<MemoryRouter><CloudVaultTab currentUser={{ uid: 'u1' }} isAdmin={false} onViewMaterial={onViewMaterial} /></MemoryRouter>);
    return onViewMaterial;
  };

  it('the tile knows', async () => {
    await saved();
    hookState = { materials: [MATERIAL] };
    renderTab();
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save AC notes for offline' })).toBeNull();
  });

  it('saving from the tile doesn’t open the file', async () => {
    hookState = { materials: [MATERIAL] };
    const onViewMaterial = renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Save AC notes for offline' }));
    await screen.findByText('Saved');
    expect(onViewMaterial).not.toHaveBeenCalled();
  });

  it('offline, saved ones show in place of "need a connection", and open', async () => {
    await saved();
    hookState = { loadError: 'offline' };
    const onViewMaterial = renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'View AC notes' }));
    expect(onViewMaterial).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1', type: 'pdf', url: MATERIAL.url }));
    expect(screen.queryByText('Handouts need a connection')).toBeNull();
    expect(screen.getByText(/You’re offline/)).toBeInTheDocument();
  });

  it('offline with none saved says how to have some', async () => {
    hookState = { loadError: 'offline' };
    renderTab();
    expect(await screen.findByText(/A handout you save for offline opens without one/)).toBeInTheDocument();
  });

  it('the viewer opens a saved one from the device, not Drive', async () => {
    await saved();
    const { container } = render(<MemoryRouter><MaterialViewer material={MATERIAL} onClose={() => {}} /></MemoryRouter>);
    expect(await screen.findByText('device pdf AC notes')).toBeInTheDocument();
    expect(container.ownerDocument.querySelector('iframe')).toBeNull();
  });

  it('the viewer opens an unsaved one from Drive', async () => {
    render(<MemoryRouter><MaterialViewer material={MATERIAL} onClose={() => {}} /></MemoryRouter>);
    await waitFor(() => expect(document.querySelector('iframe')).toBeTruthy());
    expect(document.querySelector('iframe').src).toContain('drive.google.com/file/d/abc123/preview');
  });
});
