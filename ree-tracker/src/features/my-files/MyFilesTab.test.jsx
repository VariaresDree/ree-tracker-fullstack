// src/features/my-files/MyFilesTab.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import * as idb from 'idb-keyval';
import { downloadBlob } from '../exam-export/deliver';
import { __resetFilesStore, addFile } from './filesStore';
import MyFilesTab from './MyFilesTab';

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
let uid = 'u1';
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid } }) }));
vi.mock('../exam-export/deliver', () => ({ canDownloadFiles: () => true, downloadBlob: vi.fn() }));
vi.mock('../../components/PdfCanvasViewer', () => ({ default: ({ title, blob }) => <p>pdf viewer {title} {blob.size}</p> }));

const Where = () => <p data-testid="where">{useLocation().search}</p>;
const renderTab = () => render(
  <MemoryRouter initialEntries={['/library?tab=files']}>
    <Where />
    <MyFilesTab />
  </MemoryRouter>,
);
const pick = (...files) => fireEvent.change(document.querySelector('input[type="file"]'), { target: { files } });
const text = (name = 'notes.txt', body = 'Ohm’s law') => new File([body], name, { type: 'text/plain' });

beforeEach(() => {
  uid = 'u1';
  idb.__data.clear();
  downloadBlob.mockClear();
  __resetFilesStore();
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

describe('My files', () => {
  it('starts empty and says what to do', async () => {
    renderTab();
    expect(await screen.findByText('No files yet')).toBeInTheDocument();
    expect(screen.getByText(/never uploaded/)).toBeInTheDocument();
  });

  it('keeps a file, and it’s still there after a restart', async () => {
    const view = renderTab();
    pick(text());
    expect(await screen.findByRole('button', { name: 'Open notes.txt' })).toBeInTheDocument();
    expect(screen.getByText(/Text · 11 B/)).toBeInTheDocument();
    view.unmount();
    __resetFilesStore();
    renderTab();
    expect(await screen.findByRole('button', { name: 'Open notes.txt' })).toBeInTheDocument();
  });

  it('takes several at once', async () => {
    renderTab();
    pick(text('a.txt'), new File(['x'], 'b.png', { type: 'image/png' }), new File(['x'], 'c.mp3', { type: 'audio/mpeg' }), new File(['%PDF'], 'd.pdf', { type: 'application/pdf' }));
    await screen.findByRole('button', { name: 'Open d.pdf' });
    await screen.findByRole('button', { name: 'Open a.txt' });
    expect(screen.getAllByRole('button', { name: /^Open / })).toHaveLength(4);
    expect(screen.getByText(/4 files/)).toBeInTheDocument();
  });

  it('names what it can’t open, and keeps the rest', async () => {
    renderTab();
    pick(new File(['x'], 'report.docx', { type: 'application/msword' }), text());
    expect(await screen.findByRole('alert')).toHaveTextContent('report.docx can’t be opened here');
    expect(await screen.findByRole('button', { name: 'Open notes.txt' })).toBeInTheDocument();
  });

  it('names one that’s too big, and writes nothing', async () => {
    renderTab();
    const huge = text('huge.txt');
    Object.defineProperty(huge, 'size', { value: 201 * 1024 * 1024 });
    pick(huge);
    expect(await screen.findByRole('alert')).toHaveTextContent('huge.txt: That’s 201.0 MB');
    expect(idb.__data.size).toBe(0);
  });

  it('searches by name', async () => {
    await addFile('u1', text('alpha.txt'), { name: 'alpha.txt', kind: 'text' });
    await addFile('u1', text('beta.txt'), { name: 'beta.txt', kind: 'text' });
    renderTab();
    fireEvent.change(await screen.findByLabelText('Search your files'), { target: { value: 'BETA' } });
    expect(screen.queryByRole('button', { name: 'Open alpha.txt' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Open beta.txt' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search your files'), { target: { value: 'zzz' } });
    expect(screen.getByText('Nothing matches')).toBeInTheDocument();
  });

  it('renames', async () => {
    await addFile('u1', text(), { name: 'notes.txt', kind: 'text' });
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Rename notes.txt' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rename this file' });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Ohm.txt' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('button', { name: 'Open Ohm.txt' })).toBeInTheDocument();
  });

  it('delete asks first', async () => {
    await addFile('u1', text(), { name: 'notes.txt', kind: 'text' });
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete notes.txt' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this file?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep it' }));
    expect(screen.getByRole('button', { name: 'Open notes.txt' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete notes.txt' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Delete this file?' })).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('No files yet')).toBeInTheDocument();
    expect(idb.__data.size).toBe(0);
  });

  it('saves a copy outside the app', async () => {
    await addFile('u1', text(), { name: 'notes.txt', kind: 'text' });
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Save notes.txt outside the app' }));
    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1));
    expect(downloadBlob.mock.calls[0][1]).toBe('notes.txt');
  });

  it('another account sees none of them', async () => {
    await addFile('u1', text(), { name: 'notes.txt', kind: 'text' });
    uid = 'u2';
    renderTab();
    expect(await screen.findByText('No files yet')).toBeInTheDocument();
    expect(screen.queryByText('notes.txt')).toBeNull();
  });

  it('tells a saved handout from your own', async () => {
    await addFile('u1', new Blob(['%PDF'], { type: 'application/pdf' }), { name: 'AC notes', kind: 'pdf', source: { kind: 'handout', materialId: 'm1', url: 'u' } });
    renderTab();
    expect(await screen.findByText('Saved handout')).toBeInTheDocument();
  });
});

describe('Opening a file', () => {
  it('reads text, in the URL, and Back closes it', async () => {
    await addFile('u1', text(), { name: 'notes.txt', kind: 'text' });
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Open notes.txt' }));
    const dialog = await screen.findByRole('dialog', { name: 'notes.txt' });
    expect(await within(dialog).findByText('Ohm’s law')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('file=');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    await waitFor(() => expect(screen.getByTestId('where')).not.toHaveTextContent('file='));
  });

  it('a PDF goes to the PDF viewer, with its bytes', async () => {
    await addFile('u1', new File(['%PDF-1'], 'd.pdf', { type: 'application/pdf' }), { name: 'd.pdf', kind: 'pdf' });
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Open d.pdf' }));
    expect(await screen.findByText('pdf viewer d.pdf 6')).toBeInTheDocument();
  });

  it('audio plays from the device, with its own type, and lets go of it on close', async () => {
    await addFile('u1', new File(['x'], 'c.ogg', { type: 'audio/ogg' }), { name: 'c.ogg', kind: 'audio' });
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Open c.ogg' }));
    const dialog = await screen.findByRole('dialog', { name: 'c.ogg' });
    await waitFor(() => expect(dialog.querySelector('source')).toHaveAttribute('src', 'blob:x'));
    expect(dialog.querySelectorAll('source')).toHaveLength(1);
    expect(dialog.querySelector('source')).toHaveAttribute('type', 'audio/ogg');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x'));
  });

  it('says so when the browser has cleared the bytes', async () => {
    const { id } = await addFile('u1', text(), { name: 'notes.txt', kind: 'text' });
    idb.__data.delete(`u1:file:blob:${id}`);
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Open notes.txt' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no longer on this device');
  });
});
