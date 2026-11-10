// The handouts list: separate folders and files, the whole card opens a file,
// search across every folder, recently opened, and the two admin bugs (renaming
// a file always failed; a failed delete said it worked).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const renameItem = vi.fn();
const deleteItem = vi.fn();
const navigateToFolder = vi.fn();
const uploadAndCommitMaterial = vi.fn();
const moveItems = vi.fn();
const toastSuccess = vi.fn();
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: (...a) => toastSuccess(...a), error: vi.fn() }) }));

const hook = {
  folders: [{ id: 'f1', name: 'Machines', parentId: null }, { id: 'f2', name: 'Transformers', parentId: 'f1' }],
  materials: [
    { id: 'm1', name: 'Top notes', type: 'pdf', url: 'u1', folderId: null, createdAt: '2026-01-01' },
    { id: 'm2', name: 'Machines quiz', type: 'pdf', url: 'u2', folderId: 'f1', createdAt: '2026-01-02' },
    { id: 'm3', name: 'Core losses', type: 'image', url: 'u3', folderId: 'f2', createdAt: '2026-01-03' },
  ],
  quizFiles: [
    { id: 'q1', name: 'Terms-10', folderId: null, sizeBytes: 100, createdAt: '2026-01-01' },
    { id: 'q2', name: 'Terms-2', folderId: null, sizeBytes: 100, createdAt: '2026-01-05' },
    { id: 'q3', name: 'Machines drill', folderId: 'f2', sizeBytes: 100, createdAt: '2026-01-02' },
  ],
  currentFolderId: 'root',
  breadcrumbs: [{ id: 'root', name: 'Handouts' }],
  isUploading: false, dragOverFolderId: null, isLoading: false, loadError: null, reload: vi.fn(),
  navigateToFolder, navigateToBreadcrumb: vi.fn(), revealFolder: vi.fn(), createFolder: vi.fn(), uploadAndCommitMaterial, addMaterialRecord: vi.fn(),
  deleteItem, renameItem, moveItem: vi.fn(), moveItems, putQuizFile: vi.fn(), dropQuizFile: vi.fn(),
  handleDragStart: vi.fn(), handleDragOver: vi.fn(), handleDragLeave: vi.fn(), handleDrop: vi.fn(),
};
vi.mock('./useFileManager', () => ({ useFileManager: () => hook }));
// The two quiz sections have their own tests; here, only what they're handed.
vi.mock('../shared-quizzes/FolderQuizzes', () => ({
  default: ({ files, whereOf }) => <ul aria-label="Quiz tiles">{files.map((f) => <li key={f.id}>{f.name}{whereOf ? ` in ${whereOf(f)}` : ''}</li>)}</ul>,
}));
vi.mock('../shared-quizzes/AdminQuizFiles', () => ({
  default: ({ files, folderId, onToggle, selecting }) => (
    <ul aria-label="Admin quiz files" data-folder={folderId}>
      {files.map((f) => <li key={f.id}>{f.name}{selecting && <input type="checkbox" aria-label={`Select ${f.name}`} onChange={() => onToggle(f)} />}</li>)}
    </ul>
  ),
}));

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
    expect(within(folders).getByText('2 files · 1 quiz file')).toBeInTheDocument();
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

describe('quiz files in the folders', () => {
  it('a learner sees the open folder’s quiz files, numbered names in order', async () => {
    show();
    const tiles = await screen.findByRole('list', { name: 'Quiz tiles' });
    expect(within(tiles).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Terms-2', 'Terms-10']);
  });

  it('search finds a quiz file in any folder, and says where it is', async () => {
    show();
    fireEvent.change(screen.getByLabelText('Search handouts'), { target: { value: 'drill' } });
    expect(await screen.findByText('Machines drill in Machines / Transformers')).toBeInTheDocument();
  });

  it('newest first is remembered on this device', async () => {
    const first = show();
    fireEvent.change(screen.getByLabelText('Sort files'), { target: { value: 'date' } });
    first.unmount();
    show();
    expect(screen.getByLabelText('Sort files')).toHaveValue('date');
    const tiles = await screen.findByRole('list', { name: 'Quiz tiles' });
    expect(within(tiles).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Terms-2', 'Terms-10']);
  });

  it('a file shows its kind as an icon with a name, not a code', () => {
    show();
    const files = screen.getByRole('region', { name: 'Files' });
    expect(within(files).getByText('PDF')).toBeInTheDocument();
  });

  it('the admin’s quiz section gets the open folder, for uploads', async () => {
    show({ isAdmin: true });
    expect(await screen.findByRole('list', { name: 'Admin quiz files' })).toHaveAttribute('data-folder', 'root');
    expect(screen.queryByRole('list', { name: 'Quiz tiles' })).toBeNull();
  });
});

describe('moving', () => {
  it('Move on one file picks a folder in the sheet, and moves it there', async () => {
    moveItems.mockResolvedValue();
    show({ isAdmin: true });
    fireEvent.click(screen.getByRole('button', { name: 'Move Top notes' }));
    const sheet = await screen.findByRole('dialog', { name: 'Move 1 item' });
    expect(within(sheet).getByRole('button', { name: 'Move here' })).toBeDisabled();
    fireEvent.click(within(sheet).getByLabelText('Transformers'));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Move here' }));
    await vi.waitFor(() => expect(moveItems).toHaveBeenCalledWith([{ id: 'm1', type: 'material' }], 'f2'));
  });

  it('selects several, quiz files too, and moves them together', async () => {
    moveItems.mockResolvedValue();
    show({ isAdmin: true });
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Top notes' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Terms-2' }));
    expect(screen.getByText('2 items selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Move…' }));
    const sheet = await screen.findByRole('dialog', { name: 'Move 2 items' });
    fireEvent.click(within(sheet).getByLabelText('Machines'));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Move here' }));
    await vi.waitFor(() => expect(moveItems).toHaveBeenCalledWith([{ id: 'm1', type: 'material' }, { id: 'q2', type: 'quiz' }], 'f1'));
    await vi.waitFor(() => expect(screen.queryByText(/selected/)).toBeNull());
  });

  it('a folder can’t be moved into itself or below itself', async () => {
    show({ isAdmin: true });
    fireEvent.click(screen.getByRole('button', { name: 'Move Machines' }));
    const sheet = await screen.findByRole('dialog', { name: 'Move 1 item' });
    expect(within(sheet).queryByLabelText('Machines')).toBeNull();
    expect(within(sheet).queryByLabelText('Transformers')).toBeNull();
    // It's where the folder is now, so it's marked and can't be picked to move to.
    fireEvent.click(within(sheet).getByLabelText(/^Handouts \(top level\)/));
    expect(within(sheet).getByText('here now')).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Move here' })).toBeDisabled();
  });

  it('deleting a folder says its quiz files move to the top level', () => {
    show({ isAdmin: true });
    fireEvent.click(screen.getByRole('button', { name: 'Delete folder' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('1 quiz file inside moves to the top level instead.');
  });
});
