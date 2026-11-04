// src/features/shared-quizzes/AdminQuizFiles.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { apiRequest } from '../../services/dbQueries';
import AdminQuizFiles from './AdminQuizFiles';

vi.mock('../../services/dbQueries', () => ({ apiRequest: vi.fn() }));

const fixture = (name, as = name) => new File(
  [readFileSync(join(process.cwd(), 'src/features/quiz-launcher/__fixtures__', name))],
  as,
  { type: 'application/octet-stream' },
);
const row = (over = {}) => ({ id: 'f1', name: 'Stored quiz', fileName: 'stored.quiz', subject: 'EE', description: null, sizeBytes: 2048, questionCount: 10, skippedCount: 1, checksum: 'a'.repeat(64), ...over });
const pickerInput = () => document.querySelectorAll('input[type="file"]')[0];
const replaceInput = () => document.querySelectorAll('input[type="file"]')[1];

let items;
beforeEach(() => {
  items = [row()];
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (endpoint, method) => {
    if (method === 'GET') return { items };
    if (method === 'DELETE') return { success: true };
    if (method === 'POST') return { item: row({ id: 'new', name: new URLSearchParams(endpoint.split('?')[1]).get('name'), checksum: 'b'.repeat(64) }) };
    if (method === 'PUT') return { item: row({ questionCount: 49 }) };
    return { item: row({ name: 'Renamed' }) };
  });
});

const stage = async (file = fixture('ac-circuits.quiz')) => {
  render(<AdminQuizFiles />);
  await screen.findByText('Stored quiz');
  fireEvent.change(pickerInput(), { target: { files: [file] } });
};

describe('Admin quiz files', () => {
  it('lists what’s shared, with the total used', async () => {
    render(<AdminQuizFiles />);
    expect(await screen.findByText('Stored quiz')).toBeInTheDocument();
    expect(screen.getByText('EE · 10 questions, 1 skipped · 2.0 KB')).toBeInTheDocument();
    expect(screen.getByText(/1 shared · 2\.0 KB in the database/)).toBeInTheDocument();
  });

  it('shows what a file holds before anything uploads', async () => {
    await stage();
    expect(await screen.findByText('36 questions')).toBeInTheDocument();
    expect(apiRequest.mock.calls.filter(([, method]) => method === 'POST')).toEqual([]);
    expect(screen.getByLabelText('Name')).toHaveValue('ac-circuits');
  });

  it('uploads the file with its name, subject and counts', async () => {
    await stage();
    await screen.findByText('36 questions');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'AC set 1' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'EE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));
    expect(await screen.findByText('AC set 1')).toBeInTheDocument();
    const [endpoint, method, body, opts] = apiRequest.mock.calls.find(([, m]) => m === 'POST');
    const query = new URLSearchParams(endpoint.split('?')[1]);
    expect(method).toBe('POST');
    expect(body).toBeNull();
    expect(opts.rawBody).toBeInstanceOf(File);
    expect(Object.fromEntries(query)).toEqual({ name: 'AC set 1', fileName: 'ac-circuits.quiz', subject: 'EE', questionCount: '36', skippedCount: '0' });
    expect(screen.queryByRole('list', { name: 'Files to upload' })).toBeNull();
  });

  it('a file that can’t be read says so and can’t be uploaded', async () => {
    await stage(new File(['not a zip at all'], 'bad.quiz'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid quiz file/i);
    expect(screen.getByRole('button', { name: /^Upload/ })).toBeDisabled();
  });

  it('a file over 5 MB is refused before it’s sent', async () => {
    await stage(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'huge.quiz'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Quiz files can be up to 5 MB.');
  });

  it('a refused upload stays on the list with the reason', async () => {
    apiRequest.mockImplementation(async (endpoint, method) => {
      if (method === 'GET') return { items };
      throw new Error('That file is already here, as Stored quiz.');
    });
    await stage();
    await screen.findByText('36 questions');
    fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already here, as Stored quiz');
    expect(screen.getByRole('list', { name: 'Files to upload' })).toBeInTheDocument();
  });

  it('edits a file’s details', async () => {
    render(<AdminQuizFiles />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Stored quiz' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit quiz file' });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Renamed' } });
    fireEvent.change(within(dialog).getByLabelText('Subject'), { target: { value: '' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Renamed')).toBeInTheDocument();
    const [endpoint, , body] = apiRequest.mock.calls.find(([, m]) => m === 'PATCH');
    expect(endpoint).toBe('/api/admin/quiz-files/f1');
    expect(body).toEqual({ name: 'Renamed', subject: null, description: '' });
  });

  it('replacing shows what the new file holds first', async () => {
    render(<AdminQuizFiles />);
    fireEvent.click(await screen.findByRole('button', { name: 'Replace the file for Stored quiz' }));
    fireEvent.change(replaceInput(), { target: { files: [fixture('alternators.quiz')] } });
    const dialog = await screen.findByRole('dialog', { name: 'Replace this file?' });
    expect(dialog).toHaveTextContent('holds 49 questions');
    expect(dialog).toHaveTextContent('sees Update available');
    expect(apiRequest.mock.calls.filter(([, m]) => m === 'PUT')).toEqual([]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Replace' }));
    await waitFor(() => expect(screen.getByText(/EE · 49 questions/)).toBeInTheDocument());
    const [endpoint, , , opts] = apiRequest.mock.calls.find(([, m]) => m === 'PUT');
    expect(endpoint).toContain('/api/admin/quiz-files/f1/file?');
    expect(opts.rawBody).toBeInstanceOf(File);
  });

  it('a replacement that can’t be read can’t be confirmed', async () => {
    render(<AdminQuizFiles />);
    fireEvent.click(await screen.findByRole('button', { name: 'Replace the file for Stored quiz' }));
    fireEvent.change(replaceInput(), { target: { files: [new File(['x'], 'notes.pdf')] } });
    const dialog = await screen.findByRole('dialog', { name: 'Replace this file?' });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('notes.pdf isn’t a quiz file');
    expect(within(dialog).getByRole('button', { name: 'Replace' })).toBeDisabled();
  });

  it('delete asks first, and says downloaded copies stay', async () => {
    render(<AdminQuizFiles />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Stored quiz' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this quiz file?' });
    expect(dialog).toHaveTextContent('keeps their copy');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('Stored quiz')).toBeNull());
    expect(apiRequest).toHaveBeenCalledWith('/api/admin/quiz-files/f1', 'DELETE', null, expect.anything());
    expect(await screen.findByText('No quiz files shared yet')).toBeInTheDocument();
  });

  it('a failed delete keeps the file and says why', async () => {
    render(<AdminQuizFiles />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Stored quiz' }));
    apiRequest.mockImplementation(async () => { throw new Error('[OFFLINE]'); });
    const dialog = await screen.findByRole('dialog', { name: 'Delete this quiz file?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('You’re offline');
    expect(screen.getAllByText('Stored quiz').length).toBeGreaterThan(0);
  });
});
