// Queued printed-set writes laid over a set and over the list, so a set made
// or edited offline shows as it will be once the queue replays.
import { describe, it, expect } from 'vitest';
import {
  PRINTED_SETS_ENDPOINT, isCreateQueued, overlaySet, overlaySetList, parseEndpoint, queuedSetWrites, queuedSheetDelta,
} from './printedSetQueue';

const ID = 'K7P29QXAM3TD';
const body = (id = ID) => ({
  id, contentId: 'c', label: 'SET A', title: 'EE', code: 'EE', profile: 'custom', edits: {}, prefs: { paper: 'a4' },
  items: [{ n: 1, options: ['a', 'b'], answerIndex: 0 }, { n: 2, options: ['a', 'b'], answerIndex: 1 }],
});
const w = (endpoint, method, b, extra = {}) => ({ id: `${method}${endpoint}`, endpoint, method, body: b, ownerUid: 'u1', createdAt: '2026-10-21T02:00:00.000Z', ...extra });
const SET = `${PRINTED_SETS_ENDPOINT}/${ID}`;

describe('printed-set queue overlay', () => {
  it('reads printed-set endpoints, and only those', () => {
    expect(parseEndpoint(PRINTED_SETS_ENDPOINT)).toEqual({ setId: null, sheets: false, sheetId: null });
    expect(parseEndpoint(`${SET}/sheets/s-1`)).toEqual({ setId: ID, sheets: true, sheetId: 's-1' });
    expect(parseEndpoint('/api/user/printed-setsX')).toBeNull();
    expect(parseEndpoint('/api/user/outside-scores')).toBeNull();
  });

  it('keeps this account\u2019s writes only (unstamped ones belong to the device\u2019s owner)', () => {
    const writes = [w(SET, 'PATCH', {}), w(SET, 'PATCH', {}, { ownerUid: 'u2' }), w(SET, 'PATCH', {}, { ownerUid: undefined }), w('/api/user/notes', 'PUT', {})];
    expect(queuedSetWrites(writes, 'u1', 'u1')).toHaveLength(2);
    expect(queuedSetWrites(writes, 'u1', 'u9')).toHaveLength(1);
  });

  it('a queued create is the set until the server has it; edits and a delete apply over it', () => {
    const writes = [
      w(PRINTED_SETS_ENDPOINT, 'POST', body()),
      w(SET, 'PATCH', { edits: { 2: { answerIndex: 0 } }, printed: true }),
    ];
    expect(isCreateQueued(writes, ID)).toBe(true);
    const set = overlaySet(null, ID, writes);
    expect(set).toMatchObject({ id: ID, itemCount: 2, edits: { 2: { answerIndex: 0 } }, printedAt: '2026-10-21T02:00:00.000Z' });
    // A copy that already has the create keeps itself.
    expect(overlaySet({ ...body(), title: 'server' }, ID, writes).title).toBe('server');
    expect(overlaySet(set, ID, [...writes, w(SET, 'DELETE', null)])).toBeNull();
    // Another set's writes don't touch it.
    expect(overlaySet(null, ID, [w(PRINTED_SETS_ENDPOINT, 'POST', body('AAAAAAAAAAAA'))])).toBeNull();
  });

  it('counts queued sheets: added minus deleted', () => {
    const writes = [w(`${SET}/sheets`, 'POST', {}), w(`${SET}/sheets`, 'POST', {}), w(`${SET}/sheets/s1`, 'DELETE', null), w(`${SET}/sheets/s2`, 'PATCH', {})];
    expect(queuedSheetDelta(writes, ID)).toBe(1);
  });

  it('the list shows a queued create at once, a delete at once, and printed and edited marks', () => {
    const list = [{ id: 'OLD000000000', createdAt: '2026-10-01T00:00:00.000Z', printedAt: null, _count: { sheets: 2 } }];
    const writes = [
      w(PRINTED_SETS_ENDPOINT, 'POST', body()),
      w(SET, 'PATCH', { edits: { 1: { text: 'x' } } }),
      w(`${PRINTED_SETS_ENDPOINT}/OLD000000000`, 'PATCH', { printed: true }),
      w(`${PRINTED_SETS_ENDPOINT}/OLD000000000/sheets`, 'POST', {}),
    ];
    const { value, count } = overlaySetList(list, writes, 'u1', 'u1');
    expect(count).toBe(4);
    expect(value.map((s) => s.id)).toEqual([ID, 'OLD000000000']);
    expect(value[0]).toMatchObject({ edited: true, itemCount: 2, _count: { sheets: 0 } });
    expect(value[0].items).toBeUndefined();
    expect(value[1]).toMatchObject({ printedAt: '2026-10-21T02:00:00.000Z', _count: { sheets: 3 } });
    const gone = overlaySetList(value, [w(SET, 'DELETE', null)], 'u1', 'u1').value;
    expect(gone.map((s) => s.id)).toEqual(['OLD000000000']);
    expect(overlaySetList(null, writes, 'u1', 'u1').value).toBeNull();
  });
});
