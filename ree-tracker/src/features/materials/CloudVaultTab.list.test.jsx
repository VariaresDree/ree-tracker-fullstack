// The handouts list: separate folders and files, the whole card opens a file,
// search across every folder, recently opened, and the two admin bugs (renaming
// a file always failed; a failed delete said it worked).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const renameItem = vi.fn();
const deleteItem = vi.fn();
const navigateToFolder = vi.fn();
const uploadAndCommitMaterial = vi.fn();
const toastSuccess = vi.fn();
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: (...a) => toastSuccess(...a), error: vi.fn() }) }));

const hook = {
  folders: [{ id: 'f1', name: 'Machines', parentId: null }, { id: 'f2', name: 'Transformers', parentId: 'f1' }],
  materials: [
    { id: 'm1', name: 'Top notes', type: 'pdf', url: 'u1', folderId: null, createdAt: '2026-01-01' },
    { id: 'm2', name: 'Machines quiz', type: 'pdf', url: 'u2', folderId: 'f1', createdAt: '2026-01-02' },
    { id: 'm3', name: 'Core losses', type: 'image', url: 'u3', folderId: 'f2', createdAt: '2026-01-03' },
  ],
  currentFolderId: 'root',
  breadcrumbs: [{ id: 'root', name: 'Handouts' }],
  isUploading: false, dragOverFolderId: null, isLoading: false, loadError: null, reload: vi.fn(),
  navigateToFolder, navigateToBreadcrumb: vi.fn(), revealFolder: vi.fn(), createFolder: vi.fn(), uploadAndCommitMaterial, addMaterialRecord: vi.fn(),
  deleteItem, renameItem, moveItem: vi.fn(),
  handleDragStart: vi.fn(), handleDragOver: vi.fn(), handleDragLeave: vi.fn(), handleDrop: vi.fn(),
};
vi.mock('./useFileManager', () => ({ useFileManager: () => hook }));

const { default: CloudVaultTab } = await import('./CloudVaultTab');
const show = (props = {}) => render(<CloudVaultTab currentUser={{ uid: 'u1' }} isAdmin={false} onViewMaterial={vi.fn()} {...props} />);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('the handouts list', () => {
  it('keeps folders and files apart, and counts what a folder holds, subfolders included', () => {
    show();
    const folders = screen.getByRole('region', { name: 'Folders' });
    expect(within(folders).getByText('2 files')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Files' })).getByText('Top notes')).toBeInTheDocument();
  });

  it('pressing anywhere on a file card opens it', () => {
    const onViewMaterial = vi.fn();
    show({ onViewMaterial });
    fireEvent.click(screen.getByText('Top notes'));
    expect(onViewMaterial).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
  });

  it('the new-tab button doesn’t also open the viewer', () => {
    const onViewMaterial = vi.fn();
    show({ onViewMaterial });
    fireEvent.click(screen.getByRole('link', { name: 'Open Top notes in a new tab' }));
    expect(onViewMaterial).not.toHaveBeenCalled();
  });

  it('search finds files and folders in every folder, and says where each file is', () => {
    show();
    fireEvent.change(screen.getByLabelText('Search handouts'), { target: { value: 'core' } });
    expect(screen.getByText('Core losses')).toBeInTheDocument();
    expect(screen.getByText('Machines / Transformers')).toBeInTheDocument();
    expect(screen.queryByText('Top notes')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search handouts'), { target: { value: 'transf' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open folder Transformers' }));
    expect(navigateToFolder).toHaveBeenCalledWith('f2', 'Transformers');
  });

  it('says when a search finds nothing', () => {
    show();
    fireEvent.change(screen.getByLabelText('Search handouts'), { target: { value: 'zzz' } });
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
  });

  it('lists what was opened most recently, newest first, per account', () => {
    const first = show();
    fireEvent.click(screen.getByText('Top notes'));
    first.unmount();
    const second = show();
    const recent = screen.getByRole('region', { name: 'Recently opened' });
    expect(within(recent).getByRole('button', { name: 'Open Top notes' })).toBeInTheDocument();
    second.unmount();
    render(<CloudVaultTab currentUser={{ uid: 'other' }} isAdmin={false} onViewMaterial={vi.fn()} />);
    expect(screen.queryByRole('region', { name: 'Recently opened' })).not.toBeInTheDocument();
  });
});

describe('admin actions', () => {
  it('renaming a file calls the file route, not the folder route', () => {
    show({ isAdmin: true });
    fireEvent.click(screen.getByRole('button', { name: 'Rename file' }));
    const box = screen.getByDisplayValue('Top notes');
    fireEvent.change(box, { target: { value: 'New name' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(renameItem).toHaveBeenCalledWith('m1', false, 'New name');
  });

  it('renaming a folder calls the folder route', () => {
    show({ isAdmin: true });
    fireEvent.click(screen.getByRole('button', { name: 'Rename folder' }));
    const box = screen.getByDisplayValue('Machines');
    fireEvent.change(box, { target: { value: 'New' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(renameItem).toHaveBeenCalledWith('f1', true, 'New');
  });

  it('a delete says nothing itself: the file manager reports success or failure', async () => {
    deleteItem.mockResolvedValue();
    show({ isAdmin: true });
    fireEvent.click(screen.getByRole('button', { name: 'Delete file' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await vi.waitFor(() => expect(deleteItem).toHaveBeenCalledWith('m1', false));
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('the add panel stays open while a file uploads, and doesn’t offer video', async () => {
    let finish;
    uploadAndCommitMaterial.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    show({ isAdmin: true });
    fireEvent.click(screen.getByRole('button', { name: /Add a file or link/ }));
    const input = screen.getByLabelText('Choose a file to upload');
    expect(input.getAttribute('accept')).not.toMatch(/video/);
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.pdf')] } });
    await vi.waitFor(() => expect(uploadAndCommitMaterial).toHaveBeenCalled());
    expect(screen.getByLabelText('Choose a file to upload')).toBeInTheDocument();
    finish();
    await vi.waitFor(() => expect(screen.queryByLabelText('Choose a file to upload')).not.toBeInTheDocument());
  });

  it('actions stay reachable by keyboard and touch', () => {
    show({ isAdmin: true });
    const box = screen.getByRole('button', { name: 'Rename file' }).parentElement;
    expect(box.className).toMatch(/group-focus-within:opacity-100/);
    expect(box.className).toMatch(/pointer-coarse:opacity-100/);
  });
});
