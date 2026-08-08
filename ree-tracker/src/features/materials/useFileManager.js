// src/features/materials/useFileManager.js
import { useState, useEffect, useCallback } from 'react';
import { storage } from '../../config/firebaseDb';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';
import {
  apiRequest,
  createFolder as apiCreateFolder,
  deleteMaterial, deleteFolder,
  updateFolder, updateMaterial,
  commitMaterialLink,
} from '../../services/dbQueries';
import { useStore } from '../../store/useStore';

// The vault UI uses a virtual 'root' id; the backend stores root as a null
// parent/folder FK (the client display filter already maps null → 'root').
const toBackendFolderId = (fid) => (!fid || fid === 'root' ? null : fid);

// Map a File's MIME type to the material `type` the vault renders/badges by.
const deriveType = (file) => {
  const t = file?.type || '';
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('audio/')) return 'audio';
  if (t.startsWith('video/')) return 'video';
  if (t === 'application/pdf') return 'pdf';
  return 'file';
};

const isOfflineErr = (e) => e?.message?.includes('[OFFLINE]');

export const useFileManager = (currentUser, isAdmin) => {
  const [folders, setFolders] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: 'root', name: 'Review Materials' }]);
  const [isLoading, setIsLoading] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  const fetchContents = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
        const data = await apiRequest('/api/materials');
        if (data && data.success) {
            setFolders(data.folders || []);
            setMaterials(data.materials || []);
        }
    } catch (error) {
      if (!error.message?.includes('[OFFLINE]')) {
        console.error("PostgreSQL read failure:", error);
        toast.error("Failed to load files.");
      }
    }
    setIsLoading(false);
  }, [currentUser]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  // --- NAVIGATION ROUTING ---
  const navigateToFolder = (folderId, folderName) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
  };

  const navigateToBreadcrumb = (index) => {
    const newPath = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newPath);
    setCurrentFolderId(newPath[newPath.length - 1].id);
  };

  // --- CRUD OPERATIONS (wired to materialRoutes; admin-only server-side) ---
  //
  // Every mutation below now handles the offline case the SAME way: on a
  // weak connection, apiRequest throws '[OFFLINE]' (hard 12s abort, or the
  // circuit breaker already open) — that used to be silently swallowed here
  // (`if (!isOfflineErr(error)) toast.error(...)` skipped the toast entirely
  // for exactly this case), so a move/create/delete/rename could no-op with
  // ZERO feedback: the admin believes it worked and navigates away. Now it
  // always shows an explicit "saved locally, will sync" toast AND queues the
  // write in the same durable outbox every other deferred mutation in the app
  // uses (useStore.queuePendingWrite), replayed by flushPendingWrites on
  // reconnect. Where it's safe to do so without fabricating a server id
  // (rename/move/delete act on an item that already HAS a real id), local
  // state is also updated optimistically so the UI reflects what will
  // actually be true once the queued write lands, instead of the stale
  // pre-mutation state.
  const createFolder = async (name) => {
    const parentId = toBackendFolderId(currentFolderId);
    try {
      await apiCreateFolder(name, parentId);
      await fetchContents();
      toast.success(`Folder "${name}" created.`);
    } catch (error) {
      if (isOfflineErr(error)) {
        // No server id yet, so we don't fabricate a folder row (a fake id
        // would break rename/move/delete attempted against it before sync) —
        // just make sure the admin knows this queued rather than vanished.
        useStore.getState().queuePendingWrite('/api/materials/folders', 'POST', { name, parentId });
        toast('Offline — "' + name + '" will be created when you reconnect.', { icon: '📡' });
      } else {
        toast.error('Failed to create folder.');
      }
    }
  };

  const addMaterialRecord = async ({ name, url, type }) => {
    const payload = { folderId: toBackendFolderId(currentFolderId), name, type: type || 'file', url };
    try {
      await commitMaterialLink(payload);
      await fetchContents();
      toast.success(`Added "${name}".`);
    } catch (error) {
      if (isOfflineErr(error)) {
        useStore.getState().queuePendingWrite('/api/materials/upload', 'POST', payload);
        toast('Offline — "' + name + '" will be added when you reconnect.', { icon: '📡' });
      } else {
        toast.error('Failed to add material.');
      }
    }
  };

  const deleteItem = async (id, isFolder) => {
    try {
      if (isFolder) await deleteFolder(id); else await deleteMaterial(id);
      await fetchContents();
      toast.success('Deleted.');
    } catch (error) {
      if (isOfflineErr(error)) {
        const endpoint = isFolder ? `/api/materials/folders/${id}` : `/api/materials/${id}`;
        useStore.getState().queuePendingWrite(endpoint, 'DELETE', null);
        // The delete WILL happen once the queued write lands — reflect that now.
        if (isFolder) setFolders(prev => prev.filter(f => f.id !== id));
        else setMaterials(prev => prev.filter(m => m.id !== id));
        toast('Offline — deletion queued, will sync when you reconnect.', { icon: '📡' });
      } else {
        toast.error('Delete failed.');
      }
    }
  };

  const renameItem = async (id, isFolder, newName) => {
    try {
      if (isFolder) await updateFolder(id, { name: newName });
      else await updateMaterial(id, { name: newName });
      await fetchContents();
    } catch (error) {
      if (isOfflineErr(error)) {
        const endpoint = isFolder ? `/api/materials/folders/${id}` : `/api/materials/${id}`;
        useStore.getState().queuePendingWrite(endpoint, 'PATCH', { name: newName });
        if (isFolder) setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
        else setMaterials(prev => prev.map(m => m.id === id ? { ...m, name: newName } : m));
        toast('Offline — rename will sync when you reconnect.', { icon: '📡' });
      } else {
        toast.error('Rename failed.');
      }
    }
  };

  const moveItem = async (itemId, itemType, targetFolderId) => {
    const folderId = toBackendFolderId(targetFolderId);
    try {
      if (itemType === 'folder') await updateFolder(itemId, { parentId: folderId });
      else await updateMaterial(itemId, { folderId });
      await fetchContents();
      toast.success('Moved.');
    } catch (error) {
      if (isOfflineErr(error)) {
        const endpoint = itemType === 'folder' ? `/api/materials/folders/${itemId}` : `/api/materials/${itemId}`;
        const body = itemType === 'folder' ? { parentId: folderId } : { folderId };
        useStore.getState().queuePendingWrite(endpoint, 'PATCH', body);
        // Reflect the move locally NOW — this is exactly what
        // apiCreateFolder/deleteFolder/etc. would have done via
        // fetchContents() had the request succeeded, so the item doesn't sit
        // in its pre-move location looking like nothing happened.
        if (itemType === 'folder') setFolders(prev => prev.map(f => f.id === itemId ? { ...f, parentId: folderId } : f));
        else setMaterials(prev => prev.map(m => m.id === itemId ? { ...m, folderId } : m));
        toast('Offline — saved locally, move will sync when you reconnect.', { icon: '📡' });
      } else {
        toast.error('Move failed.');
      }
    }
  };

  // --- UNIFIED UPLOAD WITH COMPRESSION ---
  const uploadAndCommitMaterial = async (file, customTitle) => {
    if (!file) return;

    if (file.type.includes('video')) {
        toast.error("Video uploads are restricted. Please use YouTube or Drive links instead.");
        return;
    }

    setIsUploading(true);
    let fileToUpload = file;

    if (file.type.includes('image')) {
        try {
            const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true };
            fileToUpload = await imageCompression(file, options);
        } catch (err) {
            console.warn("Compression failed, using original.", err);
        }
    }

    const cleanTitle = customTitle || fileToUpload.name.split('.')[0];
    const storageRef = ref(storage, `board_materials/${currentUser.uid}/${Date.now()}_${fileToUpload.name}`);
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    uploadTask.on('state_changed', 
      () => {}, // Tracking progress if necessary
      (error) => {
        console.error("Storage upload failed:", error);
        toast.error(`Upload failed: ${error.message}`);
        setIsUploading(false);
      }, 
      async () => {
        // Declared outside the try so the catch block can still queue the
        // record if it has a URL to work with (i.e. Storage succeeded and
        // only the PostgreSQL record commit hit the offline/breaker case).
        let downloadURL;
        try {
          downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          // Persist the Firebase downloadURL to PostgreSQL via the JSON url-branch
          // of POST /upload, then refresh so the material actually appears. (This
          // step was previously a discarded `// Phase 3` TODO — the file reached
          // Storage but was never saved, so nothing showed up in the vault.)
          await commitMaterialLink({
            folderId: toBackendFolderId(currentFolderId),
            name: cleanTitle.trim(),
            type: deriveType(file),
            url: downloadURL,
            storagePath: uploadTask.snapshot.ref.fullPath,
          });
          await fetchContents();
          toast.success(`Uploaded: ${cleanTitle}`);
        } catch (error) {
          // The file is genuinely safe in Storage either way — only the
          // record-commit step can still fail here. On offline, actually
          // queue it (the old toast here CLAIMED "will save when you
          // reconnect" without ever scheduling a retry — the record was
          // simply lost unless the admin manually re-added it).
          if (isOfflineErr(error) && downloadURL) {
            useStore.getState().queuePendingWrite('/api/materials/upload', 'POST', {
              folderId: toBackendFolderId(currentFolderId),
              name: cleanTitle.trim(),
              type: deriveType(file),
              url: downloadURL,
              storagePath: uploadTask.snapshot.ref.fullPath,
            });
            toast('Uploaded to storage — record queued, will save when you reconnect.', { icon: '📡' });
          } else {
            toast.error('Uploaded to storage, but saving the record failed.');
          }
        } finally {
          setIsUploading(false);
        }
      }
    );
  };

  // --- DRAG AND DROP PHYSICS ---
  const handleDragStart = (e, item, type) => {
    if (!isAdmin) return;
    e.dataTransfer.setData('itemId', item.id);
    e.dataTransfer.setData('itemType', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    if (!isAdmin) return;
    e.dataTransfer.dropEffect = 'move';
    if (dragOverFolderId !== targetId) setDragOverFolderId(targetId);
  };

  const handleDragLeave = () => {
    if (isAdmin) setDragOverFolderId(null);
  };

  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault();
    if (!isAdmin) return;
    setDragOverFolderId(null);
    const itemId = e.dataTransfer.getData('itemId');
    const itemType = e.dataTransfer.getData('itemType');
    if (itemId && itemType) {
      await moveItem(itemId, itemType, targetFolderId);
    }
  };

  return {
    folders, materials, currentFolderId, breadcrumbs, isLoading, isUploading, dragOverFolderId,
    navigateToFolder, navigateToBreadcrumb, createFolder, uploadAndCommitMaterial, addMaterialRecord,
    deleteItem, renameItem, moveItem,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop
  };
};