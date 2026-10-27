// Queued printed-set writes laid over a set and over the list, so a set made
// or edited offline shows as it will be once the queue replays.
import { describe, it, expect } from 'vitest';
import {
  PRINTED_SETS_ENDPOINT, isCreateQueued, overlaySet, overlaySetList, overlaySheets, parseEndpoint, queuedSetWrites,
  queuedSheetDelta,
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
    expect(parseEndpoint(PRINTED_SETS_ENDPOINT)).toEqual({ setId: null, sheets: false, sheetId: null, ifUnused: false });
    expect(parseEndpoint(`${SET}/sheets/s-1`)).toEqual({ setId: ID, sheets: true, sheetId: 's-1', ifUnused: false });
    expect(parseEndpoint(`${SET}?ifUnused=1`)).toEqual({ setId: ID, sheets: false, sheetId: null, ifUnused: true });
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

  it('a delete if unused (Draw a new set) hides only a set still unused here', () => {
    const replace = w(`${SET}?ifUnused=1`, 'DELETE', null);
    expect(overlaySet(body(), ID, [replace])).toBeNull();
    expect(overlaySet({ ...body(), printedAt: '2026-10-21T01:00:00.000Z' }, ID, [replace])).not.toBeNull();
    expect(overlaySet({ ...body(), edits: { 1: { text: 'x' } } }, ID, [replace])).not.toBeNull();
    expect(overlaySheets([{ id: 's1' }], ID, [replace])).toEqual([{ id: 's1' }]);
    const list = [
      { id: ID, createdAt: '2026-10-02T00:00:00.000Z', printedAt: null, _count: { sheets: 0 } },
      { id: 'OLD000000000', createdAt: '2026-10-01T00:00:00.000Z', printedAt: null, _count: { sheets: 2 } },
    ];
    const old = w(`${PRINTED_SETS_ENDPOINT}/OLD000000000?ifUnused=1`, 'DELETE', null);
    expect(overlaySetList(list, [replace, old], 'u1', 'u1').value.map((s) => s.id)).toEqual(['OLD000000000']);
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

  it('a set\u2019s sheets show their queued scans, corrections and deletes, once each', () => {
    const base = [{ id: 's1', takerName: 'Ana', answers: 'AB' }, { id: 's2', takerName: 'Ben', answers: 'BB' }];
    const writes = [
      w(`${SET}/sheets`, 'POST', { id: 's3', takerName: 'Cy', answers: 'AA' }),
      w(`${SET}/sheets/s1`, 'PATCH', { answers: 'BA', takerName: undefined }),
      w(`${SET}/sheets/s2`, 'DELETE', null),
      w(`${PRINTED_SETS_ENDPOINT}/OTHER0000000/sheets/s1`, 'DELETE', null),
    ];
    const list = overlaySheets(base, ID, writes);
    expect(list.map((s) => [s.id, s.takerName, s.answers])).toEqual([['s3', 'Cy', 'AA'], ['s1', 'Ana', 'BA']]);
    expect(list[0].createdAt).toBe('2026-10-21T02:00:00.000Z');
    // Applied again (a cached copy that already has them): the same.
    expect(overlaySheets(list, ID, writes)).toEqual(list);
    expect(overlaySheets(base, ID, [w(SET, 'DELETE', null)])).toEqual([]);
    expect(overlaySheets(null, ID, writes)).toBeNull();
  });
});
