// Hidden handouts (2026-11-17): the admin hides a folder or a file instead of
// deleting it. Admins see it marked, with Show to learners; inside a hidden
// folder a note says so; "View as a learner" and the Library leave it out.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const setHidden = vi.fn(async () => ({ done: 1, queued: 0, failed: 0 }));
const deleteItem = vi.fn();
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const hook = {
  folders: [
    { id: 'rc', name: 'Review Centers', parentId: null, hidden: true },
    { id: 'rcA', name: 'Center A', parentId: 'rc', hidden: false },
    { id: 'lec', name: 'Lectures', parentId: null, hidden: false },
  ],
  materials: [
    { id: 'm-top', name: 'Top notes', type: 'pdf', url: 'u1', folderId: null, hidden: false },
    { id: 'm-off', name: 'Old answer key', type: 'pdf', url: 'u2', folderId: null, hidden: true },
    { id: 'm-rc', name: 'Center handout', type: 'pdf', url: 'u3', folderId: 'rcA', hidden: false },
  ],
  quizFiles: [],
  currentFolderId: 'root',
  breadcrumbs: [{ id: 'root', name: 'Handouts' }],
  isUploading: false, dragOverFolderId: null, isLoading: false, loadError: null, reload: vi.fn(),
  navigateToFolder: vi.fn(), navigateToBreadcrumb: vi.fn(), revealFolder: vi.fn(), createFolder: vi.fn(), uploadAndCommitMaterial: vi.fn(), addMaterialRecord: vi.fn(),
  deleteItem, renameItem: vi.fn(), moveItem: vi.fn(), moveItems: vi.fn(), setHidden, putQuizFile: vi.fn(), dropQuizFile: vi.fn(),
  handleDragStart: vi.fn(), handleDragOver: vi.fn(), handleDragLeave: vi.fn(), handleDrop: vi.fn(),
};
vi.mock('./useFileManager', () => ({ useFileManager: () => hook }));
vi.mock('../shared-quizzes/FolderQuizzes', () => ({ default: () => null }));
vi.mock('../shared-quizzes/AdminQuizFiles', () => ({ default: () => null }));

const { default: CloudVaultTab } = await import('./CloudVaultTab');
const show = (props = {}) => render(<CloudVaultTab currentUser={{ uid: 'u1' }} isAdmin onViewMaterial={vi.fn()} {...props} />);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  hook.currentFolderId = 'root';
  hook.breadcrumbs = [{ id: 'root', name: 'Handouts' }];
});

describe('hidden handouts, admin', () => {
  it('marks what is hidden and counts it; the rest has no mark', () => {
    show();
    expect(screen.getByText('2 items hidden from learners')).toBeInTheDocument();
    const folders = screen.getByRole('region', { name: 'Folders' });
    expect(within(folders).getAllByText('Hidden from learners')).toHaveLength(1);
    const files = screen.getByRole('region', { name: 'Files' });
    expect(within(files).getAllByText('Hidden from learners')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Show Review Centers to learners' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide Lectures from learners' })).toBeInTheDocument();
  });

  it('hides and shows one item from its tile', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Hide Top notes from learners' }));
    expect(setHidden).toHaveBeenCalledWith([{ id: 'm-top', type: 'material' }], true);
    fireEvent.click(screen.getByRole('button', { name: 'Show Review Centers to learners' }));
    expect(setHidden).toHaveBeenLastCalledWith([{ id: 'rc', type: 'folder' }], false);
  });

  it('inside a hidden folder, a note says why and shows the folder again', () => {
    hook.currentFolderId = 'rcA';
    hook.breadcrumbs = [{ id: 'root', name: 'Handouts' }, { id: 'rc', name: 'Review Centers' }, { id: 'rcA', name: 'Center A' }];
    show();
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('“Review Centers” is hidden');
    expect(screen.getByText('Hidden with Review Centers')).toBeInTheDocument();
    fireEvent.click(within(note).getByRole('button', { name: /Show “Review Centers”/ }));
    expect(setHidden).toHaveBeenCalledWith([{ id: 'rc', type: 'folder' }], false);
  });

  it('a selection hides several at once', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Lectures' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Top notes' }));
    fireEvent.click(within(screen.getByRole('region', { name: 'Selection' })).getByRole('button', { name: 'Hide' }));
    expect(setHidden).toHaveBeenCalledWith([{ id: 'lec', type: 'folder' }, { id: 'm-top', type: 'material' }], true);
  });

  it('the delete dialog offers Hide instead, and doesn’t delete', async () => {
    show();
    const lectures = screen.getByRole('button', { name: 'Open folder Lectures' }).closest('[draggable]');
    fireEvent.click(within(lectures).getByRole('button', { name: 'Delete folder' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Hide instead' }));
    expect(setHidden).toHaveBeenCalledWith([{ id: 'lec', type: 'folder' }], true);
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it('View as a learner leaves hidden items out, with no admin tools', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'View as a learner' }));
    expect(screen.queryByText('Review Centers')).toBeNull();
    expect(screen.queryByText('Old answer key')).toBeNull();
    expect(screen.getByText('Lectures')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /from learners/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Select' })).toBeNull();
  });
});

describe('hidden handouts, Library', () => {
  it('a learner view (as the Library shows it) never lists them', () => {
    show({ isAdmin: false });
    expect(screen.queryByText('Review Centers')).toBeNull();
    expect(screen.queryByText('Old answer key')).toBeNull();
    expect(screen.queryByText(/hidden/i)).toBeNull();
  });
});
