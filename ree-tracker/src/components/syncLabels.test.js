import { describe, it, expect } from 'vitest';
import { syncActionLabel, syncFailureReason } from './syncLabels';

describe('sync labels', () => {
  it('names each queued write by what it was', () => {
    expect(syncActionLabel('/api/user/notes/question/q1', 'PUT')).toBe('A note');
    expect(syncActionLabel('/api/user/notes/question/q1', 'DELETE')).toBe('Deleting a note');
    expect(syncActionLabel('/api/exams/sessions/abc/finalize', 'POST')).toBe('A finished mock board');
    expect(syncActionLabel('/api/materials/m1', 'PATCH')).toBe('A file change');
    expect(syncActionLabel('/api/something-new', 'POST')).toBe('A saved change');
    expect(syncActionLabel(undefined)).toBe('A saved change');
  });

  it('names printed paper sets and their scanned sheets', () => {
    expect(syncActionLabel('/api/user/printed-sets', 'POST')).toBe('A printed paper set');
    expect(syncActionLabel('/api/user/printed-sets/K7P29QXAM3TD', 'PATCH')).toBe('Changes to a printed paper set');
    expect(syncActionLabel('/api/user/printed-sets/K7P29QXAM3TD', 'DELETE')).toBe('Deleting a printed paper set');
    expect(syncActionLabel('/api/user/printed-sets/K7P29QXAM3TD/sheets', 'POST')).toBe('A scanned answer sheet');
    expect(syncActionLabel('/api/user/printed-sets/K7P29QXAM3TD/sheets/s1', 'PATCH')).toBe('A correction to a scanned answer sheet');
    expect(syncActionLabel('/api/user/printed-sets/K7P29QXAM3TD/sheets/s1', 'DELETE')).toBe('Deleting a scanned answer sheet');
  });

  it('says why it stopped, from the status', () => {
    expect(syncFailureReason({ status: 500 })).toMatch(/Retrying usually works/);
    expect(syncFailureReason({ status: 409 })).toBe('It clashed with a newer change.');
    expect(syncFailureReason({ status: 503, error: 'gave up after 5 tries: x' })).toMatch(/kept failing/);
    expect(syncFailureReason({})).toBe("It couldn't be sent.");
  });
});
