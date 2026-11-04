import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Bookmarks offline: a change waits in the queue, the list comes from the device,
// and one account never sees another's copy.
const idb = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idb.get(k),
  set: async (k, v) => { idb.set(k, v); },
}));
const authState = vi.hoisted(() => ({ currentUser: { uid: 'u1' } }));
vi.mock('../config/firebaseDb', () => ({ auth: authState }));
const apiRequest = vi.fn();
vi.mock('./dbQueries', () => ({
  apiRequest: (...a) => apiRequest(...a),
  normalizeQuestions: (d) => d?.items || [],
}));
const packQuestion = { id: 'q9', text: 'From the pack', subject: 'EE' };
vi.mock('./offlinePack', () => ({
  OFFLINE_SUBJECTS: ['Mathematics', 'ESAS', 'EE'],
  getOfflinePack: async () => ({ subjects: { EE: [packQuestion] } }),
}));
const store = vi.hoisted(() => ({
  pendingWrites: [],
  ownerUid: 'u1',
  queuePendingWrite(endpoint, method, body) { store.pendingWrites.push({ endpoint, method, body, ownerUid: 'u1' }); },
  flushPendingWrites: async () => {},
}));
vi.mock('../store/useStore', () => ({ useStore: { getState: () => store } }));

const { applyQueuedBookmarks, fetchBookmarks, removeBookmark, saveBookmark } = await import('./bookmarks');

const offline = () => apiRequest.mockRejectedValue(new Error('[OFFLINE]'));
const q = (id) => ({ id, text: id });

beforeEach(() => {
  idb.clear();
  apiRequest.mockReset();
  store.pendingWrites = [];
  authState.currentUser = { uid: 'u1' };
});
afterEach(() => vi.restoreAllMocks());

describe('changing a bookmark', () => {
  it('is sent while the server answers', async () => {
    apiRequest.mockResolvedValue({ success: true });
    await expect(saveBookmark('u1', { questionId: 'q1' })).resolves.toMatchObject({ status: 'sent' });
    expect(apiRequest).toHaveBeenCalledWith('/api/bookmarks', 'POST', { questionId: 'q1' });
    expect(store.pendingWrites).toEqual([]);
  });

  it('waits in the queue offline, in order, and doesn’t fail', async () => {
    offline();
    await expect(saveBookmark('u1', { questionId: 'q1' })).resolves.toEqual({ status: 'queued' });
    await expect(removeBookmark('u1', 'q1')).resolves.toEqual({ status: 'queued' });
    expect(store.pendingWrites.map((w) => `${w.method} ${w.endpoint}`)).toEqual(['POST /api/bookmarks', 'DELETE /api/bookmarks/q1']);
  });

  it('still fails on a refusal, so the screen can undo it', async () => {
    apiRequest.mockRejectedValue(Object.assign(new Error('Question not found.'), { status: 404 }));
    await expect(saveBookmark('u1', { questionId: 'gone' })).rejects.toThrow('Question not found.');
    expect(store.pendingWrites).toEqual([]);
  });
});

describe('reading the list', () => {
  const online = () => apiRequest.mockResolvedValue({ items: [q('q1'), q('q2')] });
  const settle = () => new Promise((r) => { setTimeout(r); });

  it('offline, it comes from the last list seen', async () => {
    online();
    await fetchBookmarks();
    await settle();
    offline();
    expect((await fetchBookmarks()).map((x) => x.id)).toEqual(['q1', 'q2']);
  });

  it('a timeout reads the device too, but a server failure is an error', async () => {
    apiRequest.mockRejectedValue(new Error('[TIMEOUT]'));
    await expect(fetchBookmarks()).resolves.toEqual([]);
    apiRequest.mockRejectedValue(Object.assign(new Error('Server'), { status: 500 }));
    await expect(fetchBookmarks()).rejects.toThrow('Server');
  });

  it('another account never sees this one’s copy', async () => {
    online();
    await fetchBookmarks();
    await settle();
    offline();
    authState.currentUser = { uid: 'u2' };
    store.ownerUid = 'u2';
    await expect(fetchBookmarks()).resolves.toEqual([]);
    store.ownerUid = 'u1';
  });

  it('shows what’s waiting to be sent: added from the pack, removed from the list', async () => {
    online();
    await fetchBookmarks();
    await settle();
    offline();
    await saveBookmark('u1', { questionId: 'q9' });
    await removeBookmark('u1', 'q2');
    expect((await fetchBookmarks()).map((x) => x.id)).toEqual(['q9', 'q1']);
  });
});

describe('applyQueuedBookmarks', () => {
  const pack = { subjects: { EE: [packQuestion] } };
  const post = (id) => ({ endpoint: '/api/bookmarks', method: 'POST', body: { questionId: id } });
  const del = (id) => ({ endpoint: `/api/bookmarks/${id}`, method: 'DELETE', body: null });

  it('plays the writes in order', () => {
    expect(applyQueuedBookmarks([q('q1')], [post('q9'), del('q9')], pack).map((x) => x.id)).toEqual(['q1']);
    expect(applyQueuedBookmarks([q('q1')], [del('q1'), post('q9')], pack).map((x) => x.id)).toEqual(['q9']);
  });

  it('adds nothing twice, and leaves out a question the device can’t show', () => {
    expect(applyQueuedBookmarks([q('q9')], [post('q9')], pack).map((x) => x.id)).toEqual(['q9']);
    expect(applyQueuedBookmarks([], [post('elsewhere')], pack)).toEqual([]);
  });
});
