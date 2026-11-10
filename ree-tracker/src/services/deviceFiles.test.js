// src/services/deviceFiles.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as idb from 'idb-keyval';
import { MAX_FILE_BYTES, addDeviceFile, checkSpace, createDeviceFolder, deleteDeviceFile, deleteDeviceFolder, fileKind, getDeviceFileBlob, listDeviceFiles, listDeviceFolders, moveDeviceFile, moveDeviceFolder, renameDeviceFile, renameDeviceFolder, restoreDeviceFolders } from './deviceFiles';
import { deleteDeviceData } from './deviceStore';

vi.mock('idb-keyval', () => {
  const data = new Map();
  return {
    __data: data,
    createStore: () => 'store',
    get: vi.fn(async (k) => data.get(k)),
    set: vi.fn(async (k, v) => { data.set(k, v); }),
    del: vi.fn(async (k) => { data.delete(k); }),
    delMany: vi.fn(async (ks) => { ks.forEach((k) => data.delete(k)); }),
    keys: vi.fn(async () => [...data.keys()]),
    getMany: vi.fn(async (ks) => ks.map((k) => data.get(k))),
  };
});

const blob = (text = 'hello', type = 'text/plain') => new Blob([text], { type });
const setEstimate = (estimate) => Object.defineProperty(navigator, 'storage', { configurable: true, value: { estimate } });

beforeEach(() => {
  idb.__data.clear();
  idb.set.mockClear();
  idb.getMany.mockClear();
  setEstimate(async () => ({ usage: 0, quota: 1e12 }));
});

describe('fileKind', () => {
  it.each([
    [{ type: 'application/pdf', name: 'a.pdf' }, 'pdf'],
    [{ type: '', name: 'a.PDF' }, 'pdf'],
    [{ type: 'image/png', name: 'a.png' }, 'image'],
    [{ type: 'audio/mpeg', name: 'a.mp3' }, 'audio'],
    [{ type: 'text/plain', name: 'a.txt' }, 'text'],
    [{ type: '', name: 'notes.md' }, 'text'],
    [{ type: 'application/msword', name: 'a.doc' }, null],
    [{ type: 'application/zip', name: 'a.zip' }, null],
    [{ type: 'video/mp4', name: 'a.mp4' }, null],
    [{ type: '', name: 'noextension' }, null],
  ])('%j is %s', (file, kind) => expect(fileKind(file)).toBe(kind));
});

describe('keeping files', () => {
  it('keeps the bytes and the details, and gives both back', async () => {
    const meta = await addDeviceFile('a', blob('hello'), { name: 'n.txt', kind: 'text' });
    expect(meta).toMatchObject({ name: 'n.txt', kind: 'text', size: 5, mime: 'text/plain', source: null });
    expect(await listDeviceFiles('a')).toEqual([meta]);
    expect(await (await getDeviceFileBlob('a', meta.id)).text()).toBe('hello');
  });

  it('a list reads no file’s bytes', async () => {
    await addDeviceFile('a', blob(), { name: 'n.txt', kind: 'text' });
    idb.getMany.mockClear();
    await listDeviceFiles('a');
    const asked = idb.getMany.mock.calls.flatMap(([ks]) => ks);
    expect(asked.length).toBe(1);
    expect(asked.every((k) => k.includes(':file:meta:'))).toBe(true);
  });

  it('one account never sees another’s', async () => {
    await addDeviceFile('a', blob(), { name: 'mine', kind: 'text' });
    await addDeviceFile('b', blob(), { name: 'theirs', kind: 'text' });
    expect((await listDeviceFiles('a')).map((f) => f.name)).toEqual(['mine']);
    const [theirs] = await listDeviceFiles('b');
    expect(await getDeviceFileBlob('a', theirs.id)).toBeUndefined();
  });

  it('lists newest first', async () => {
    const spy = vi.spyOn(Date, 'now').mockReturnValueOnce(1).mockReturnValueOnce(2);
    await addDeviceFile('a', blob(), { name: 'old', kind: 'text' });
    await addDeviceFile('a', blob(), { name: 'new', kind: 'text' });
    spy.mockRestore();
    expect((await listDeviceFiles('a')).map((f) => f.name)).toEqual(['new', 'old']);
  });

  it('renames without touching the bytes', async () => {
    const { id } = await addDeviceFile('a', blob('hello'), { name: 'old', kind: 'text' });
    await renameDeviceFile('a', id, 'new');
    expect((await listDeviceFiles('a'))[0].name).toBe('new');
    expect(await (await getDeviceFileBlob('a', id)).text()).toBe('hello');
  });

  it('a delete takes the bytes too', async () => {
    const { id } = await addDeviceFile('a', blob(), { name: 'n', kind: 'text' });
    await deleteDeviceFile('a', id);
    expect(idb.__data.size).toBe(0);
  });

  it('if the details can’t be written, the bytes come back out', async () => {
    idb.set.mockImplementationOnce(async (k, v) => { idb.__data.set(k, v); });
    idb.set.mockRejectedValueOnce(Object.assign(new Error('quota'), { name: 'QuotaExceededError' }));
    await expect(addDeviceFile('a', blob(), { name: 'n', kind: 'text' })).rejects.toThrow('out of space');
    expect(idb.__data.size).toBe(0);
  });
});

describe('checking space first', () => {
  it('refuses a file over the limit, before writing anything', async () => {
    const huge = blob();
    Object.defineProperty(huge, 'size', { value: MAX_FILE_BYTES + 1 });
    await expect(addDeviceFile('a', huge, { name: 'n', kind: 'text' })).rejects.toThrow('Files can be up to 200.0 MB');
    expect(idb.set).not.toHaveBeenCalled();
  });

  it('takes a file of exactly the limit', async () => {
    await expect(checkSpace(MAX_FILE_BYTES)).resolves.toBeUndefined();
  });

  it('refuses what won’t fit, and says how much there is', async () => {
    setEstimate(async () => ({ usage: 900, quota: 1000 }));
    await expect(checkSpace(5000)).rejects.toThrow('This needs 4.9 KB, and this device has 100 B free');
  });

  it('goes ahead if the browser won’t say', async () => {
    setEstimate(async () => { throw new Error('nope'); });
    await expect(checkSpace(5000)).resolves.toBeUndefined();
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined });
    await expect(checkSpace(5000)).resolves.toBeUndefined();
  });
});

describe('removing everything on sign-out', () => {
  it('takes only that account’s files and quizzes', async () => {
    await addDeviceFile('a', blob(), { name: 'mine', kind: 'text' });
    idb.__data.set('a:quiz:file:1', {});
    await addDeviceFile('b', blob(), { name: 'theirs', kind: 'text' });
    await deleteDeviceData('a');
    expect([...idb.__data.keys()].every((k) => k.startsWith('b:'))).toBe(true);
    expect((await listDeviceFiles('b')).map((f) => f.name)).toEqual(['theirs']);
  });

  it('an account id can’t match another that starts the same', async () => {
    idb.__data.set('ab:file:meta:1', {});
    await deleteDeviceData('a');
    expect(idb.__data.has('ab:file:meta:1')).toBe(true);
  });
});

describe('folders on the device', () => {
  it('a file goes into a folder and back out, and the list still reads no bytes', async () => {
    const folder = await createDeviceFolder('u1', 'Terms');
    const { id } = await addDeviceFile('u1', blob(), { name: 'a.txt', kind: 'text', folderId: folder.id });
    expect((await listDeviceFiles('u1'))[0].folderId).toBe(folder.id);
    await moveDeviceFile('u1', id, null);
    expect((await listDeviceFiles('u1'))[0].folderId).toBeNull();
  });

  it('deleting a folder deletes no file: its files and folders move up a level', async () => {
    const top = await createDeviceFolder('u1', 'Top');
    const mid = await createDeviceFolder('u1', 'Mid', top.id);
    const low = await createDeviceFolder('u1', 'Low', mid.id);
    const { id } = await addDeviceFile('u1', blob(), { name: 'a.txt', kind: 'text', folderId: mid.id });
    await deleteDeviceFolder('u1', mid.id);
    expect((await listDeviceFiles('u1'))[0].folderId).toBe(top.id);
    expect(await getDeviceFileBlob('u1', id)).toBeTruthy();
    const folders = await listDeviceFolders('u1');
    expect(folders.map((f) => f.id)).toEqual([top.id, low.id]);
    expect(folders.find((f) => f.id === low.id).parentId).toBe(top.id);
  });

  it('a folder can’t move inside itself or below itself', async () => {
    const top = await createDeviceFolder('u1', 'Top');
    const mid = await createDeviceFolder('u1', 'Mid', top.id);
    await expect(moveDeviceFolder('u1', top.id, mid.id)).rejects.toThrow('inside itself');
    await expect(moveDeviceFolder('u1', top.id, top.id)).rejects.toThrow('inside itself');
    await moveDeviceFolder('u1', mid.id, null);
    expect((await listDeviceFolders('u1')).find((f) => f.id === mid.id).parentId).toBeNull();
  });

  it('renames, keeps folders per account, and a wipe takes them too', async () => {
    const f = await createDeviceFolder('u1', 'Old');
    await renameDeviceFolder('u1', f.id, 'New');
    expect((await listDeviceFolders('u1'))[0].name).toBe('New');
    expect(await listDeviceFolders('u2')).toEqual([]);
    await deleteDeviceData('u1');
    expect(await listDeviceFolders('u1')).toEqual([]);
  });

  it('a backup’s folders are added, and one already here stays as it is', async () => {
    const here = await createDeviceFolder('u1', 'Mine');
    const added = await restoreDeviceFolders('u1', [{ id: here.id, name: 'Theirs', parentId: null }, { id: 'b1', name: 'From backup', parentId: here.id }, { name: 'no id' }]);
    expect(added).toBe(1);
    expect(await listDeviceFolders('u1')).toEqual([here, { id: 'b1', name: 'From backup', parentId: here.id }]);
  });
});
