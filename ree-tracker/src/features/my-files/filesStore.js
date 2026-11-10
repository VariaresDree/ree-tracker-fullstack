// src/features/my-files/filesStore.js
//
// The list of files on this device, shared by My files, the handout tiles and the
// handout viewer, so saving one shows everywhere at once. A list belongs to one
// account: another account sees none of it, even before its own has loaded.
import { useEffect, useSyncExternalStore } from 'react';
import {
  addDeviceFile, createDeviceFolder, deleteDeviceFile, deleteDeviceFolder, listDeviceFiles, listDeviceFolders,
  moveDeviceFile, moveDeviceFolder, renameDeviceFile, renameDeviceFolder,
} from '../../services/deviceFiles';

const EMPTY = { uid: null, files: [], folders: [], loaded: false };
let state = EMPTY;
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getState = () => state;
const emit = () => listeners.forEach((l) => l());

export async function refreshFiles(uid) {
  const [files, folders] = await Promise.all([listDeviceFiles(uid), listDeviceFolders(uid)]);
  state = { uid, files, folders, loaded: true };
  emit();
}

const thenRefresh = (work) => async (uid, ...args) => {
  try {
    return await work(uid, ...args);
  } finally {
    await refreshFiles(uid);
  }
};

export const addFolder = thenRefresh(createDeviceFolder);
export const renameFolder = thenRefresh(renameDeviceFolder);
export const removeFolder = thenRefresh(deleteDeviceFolder);

/** Each of [{ id, type: 'file' | 'folder' }] into one folder ('root' or null is the top). */
export const moveItems = thenRefresh(async (uid, items, target) => {
  const folderId = target && target !== 'root' ? target : null;
  for (const { id, type } of items) {
    if (type === 'folder') await moveDeviceFolder(uid, id, folderId);
    else await moveDeviceFile(uid, id, folderId);
  }
});

export async function addFile(uid, blob, details) {
  const meta = await addDeviceFile(uid, blob, details);
  await refreshFiles(uid);
  return meta;
}

export async function renameFile(uid, id, name) {
  await renameDeviceFile(uid, id, name);
  await refreshFiles(uid);
}

export async function removeFile(uid, id) {
  await deleteDeviceFile(uid, id);
  await refreshFiles(uid);
}

/** The files on this device for this account. */
export function useMyFiles(uid) {
  const current = useSyncExternalStore(subscribe, getState, getState);
  useEffect(() => { refreshFiles(uid); }, [uid]);
  return current.uid === uid ? current : { uid, files: [], folders: [], loaded: false };
}

/** Test seam. */
export function __resetFilesStore() {
  state = EMPTY;
  emit();
}
