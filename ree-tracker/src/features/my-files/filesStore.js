// src/features/my-files/filesStore.js
//
// The list of files on this device, shared by My files, the handout tiles and the
// handout viewer, so saving one shows everywhere at once. A list belongs to one
// account: another account sees none of it, even before its own has loaded.
import { useEffect, useSyncExternalStore } from 'react';
import { addDeviceFile, deleteDeviceFile, listDeviceFiles, renameDeviceFile } from '../../services/deviceFiles';

const EMPTY = { uid: null, files: [], loaded: false };
let state = EMPTY;
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getState = () => state;
const emit = () => listeners.forEach((l) => l());

export async function refreshFiles(uid) {
  const files = await listDeviceFiles(uid);
  state = { uid, files, loaded: true };
  emit();
}

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
  return current.uid === uid ? current : { uid, files: [], loaded: false };
}

/** Test seam. */
export function __resetFilesStore() {
  state = EMPTY;
  emit();
}
