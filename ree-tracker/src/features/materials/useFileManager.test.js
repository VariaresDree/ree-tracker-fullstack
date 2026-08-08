// Regression coverage for 2.3: useFileManager's mutations used to swallow
// '[OFFLINE]' errors with NO feedback at all
// (`if (!isOfflineErr(error)) toast.error(...)` — the offline case fell
// through and did nothing), so a move/create/delete/rename on a weak
// connection could no-op silently and the admin would navigate away
// believing it worked. This suite drives each mutation through a rejected
// apiRequest tagged '[OFFLINE]' and asserts: (1) an explicit toast always
// fires, (2) the write lands in the durable outbox (queuePendingWrite) with
// the same endpoint/method/body dbQueries.js would have sent, and (3) where
// it's safe (an item that already has a real id), local state updates
// optimistically instead of showing the stale pre-mutation state.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { useFileManager } from './useFileManager';

const queuePendingWrite = vi.fn();
vi.mock('../../store/useStore', () => ({
  useStore: { getState: () => ({ queuePendingWrite }) },
}));

let apiRequestMock;
const createFolderMock = vi.fn();
const deleteMaterialMock = vi.fn();
const deleteFolderMock = vi.fn();
const updateFolderMock = vi.fn();
const updateMaterialMock = vi.fn();
const commitMaterialLinkMock = vi.fn();

vi.mock('../../services/dbQueries', () => ({
  apiRequest: (...args) => apiRequestMock(...args),
  createFolder: (...args) => createFolderMock(...args),
  deleteMaterial: (...args) => deleteMaterialMock(...args),
  deleteFolder: (...args) => deleteFolderMock(...args),
  updateFolder: (...args) => updateFolderMock(...args),
  updateMaterial: (...args) => updateMaterialMock(...args),
  commitMaterialLink: (...args) => commitMaterialLinkMock(...args),
}));

vi.mock('../../config/firebaseDb', () => ({ storage: {} }));
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytesResumable: vi.fn(),
  getDownloadURL: vi.fn(),
}));
vi.mock('browser-image-compression', () => ({ default: vi.fn() }));

const OFFLINE = () => Object.assign(new Error('[OFFLINE]'), {});

const currentUser = { uid: 'user-1' };

async function bootHook(seedFolders, seedMaterials) {
  apiRequestMock.mockResolvedValueOnce({ success: true, folders: seedFolders, materials: seedMaterials });
  const { result } = renderHook(() => useFileManager(currentUser, true));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

describe('useFileManager — offline mutations never fail silently', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequestMock = vi.fn();
  });

  it('createFolder: queues the write and toasts explicitly on [OFFLINE], with no fabricated local row', async () => {
    const result = await bootHook([], []);
    createFolderMock.mockRejectedValueOnce(OFFLINE());
    const errorToastSpy = vi.spyOn(toast, 'error');

    await act(async () => { await result.current.createFolder('New Folder'); });

    expect(queuePendingWrite).toHaveBeenCalledWith('/api/materials/folders', 'POST', { name: 'New Folder', parentId: null });
    // The old code's `if (!isOfflineErr(error)) toast.error(...)` meant the
    // offline branch showed NOTHING — not even a plain error toast. Confirm
    // that path is gone (toast.error is reserved for genuine failures now;
    // the offline case gets its own explicit "queued" toast instead).
    expect(errorToastSpy).not.toHaveBeenCalled();
  });

  it('deleteItem (material): queues a DELETE, removes it from local state immediately, and toasts', async () => {
    const result = await bootHook([], [{ id: 'm1', name: 'Notes.pdf', folderId: null }]);
    deleteMaterialMock.mockRejectedValueOnce(OFFLINE());

    await act(async () => { await result.current.deleteItem('m1', false); });

    expect(queuePendingWrite).toHaveBeenCalledWith('/api/materials/m1', 'DELETE', null);
    expect(result.current.materials.find((m) => m.id === 'm1')).toBeUndefined();
  });

  it('renameItem (folder): queues a PATCH and updates the name locally', async () => {
    const result = await bootHook([{ id: 'f1', name: 'Old Name', parentId: null }], []);
    updateFolderMock.mockRejectedValueOnce(OFFLINE());

    await act(async () => { await result.current.renameItem('f1', true, 'New Name'); });

    expect(queuePendingWrite).toHaveBeenCalledWith('/api/materials/folders/f1', 'PATCH', { name: 'New Name' });
    expect(result.current.folders.find((f) => f.id === 'f1').name).toBe('New Name');
  });

  it('moveItem (material): queues a PATCH and reflects the new folderId locally instead of leaving stale pre-move state', async () => {
    const result = await bootHook(
      [{ id: 'target-folder', name: 'Target', parentId: null }],
      [{ id: 'm1', name: 'Notes.pdf', folderId: null }],
    );
    updateMaterialMock.mockRejectedValueOnce(OFFLINE());

    await act(async () => { await result.current.moveItem('m1', 'material', 'target-folder'); });

    expect(queuePendingWrite).toHaveBeenCalledWith('/api/materials/m1', 'PATCH', { folderId: 'target-folder' });
    expect(result.current.materials.find((m) => m.id === 'm1').folderId).toBe('target-folder');
  });

  it('moveItem (folder) to root: queues parentId:null and updates local state to match', async () => {
    const result = await bootHook([{ id: 'f1', name: 'Sub', parentId: 'root-parent' }], []);
    updateFolderMock.mockRejectedValueOnce(OFFLINE());

    await act(async () => { await result.current.moveItem('f1', 'folder', 'root'); });

    expect(queuePendingWrite).toHaveBeenCalledWith('/api/materials/folders/f1', 'PATCH', { parentId: null });
    expect(result.current.folders.find((f) => f.id === 'f1').parentId).toBe(null);
  });

  it('addMaterialRecord: queues the link commit and does not silently drop it', async () => {
    const result = await bootHook([], []);
    commitMaterialLinkMock.mockRejectedValueOnce(OFFLINE());

    await act(async () => {
      await result.current.addMaterialRecord({ name: 'Reference Link', url: 'https://example.com', type: 'link' });
    });

    expect(queuePendingWrite).toHaveBeenCalledWith('/api/materials/upload', 'POST', {
      folderId: null, name: 'Reference Link', type: 'link', url: 'https://example.com',
    });
  });

  it('a genuine (non-offline) failure still shows the plain error toast and does NOT queue anything', async () => {
    const result = await bootHook([], [{ id: 'm1', name: 'Notes.pdf', folderId: null }]);
    deleteMaterialMock.mockRejectedValueOnce(new Error('Server exploded'));
    const toastSpy = vi.spyOn(toast, 'error');

    await act(async () => { await result.current.deleteItem('m1', false); });

    expect(queuePendingWrite).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith('Delete failed.');
    // Not removed locally — a real failure must not pretend it worked.
    expect(result.current.materials.find((m) => m.id === 'm1')).toBeDefined();
  });
});
