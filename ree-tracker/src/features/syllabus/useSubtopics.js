// src/features/syllabus/useSubtopics.js
//
// Each topic's table of contents: the suggested list (Admin › Subtopics) with
// this learner's own rows laid over it (@ree/shared mergeSubtopics). Both paint
// from this device's copy, and every change shows at once and is sent or queued
// (hooks/createSyncedList). A row is written only once the learner changes it, as
// its full state, so a learner who changes nothing follows later Admin edits.
// Display only: nothing but this checklist reads these rows.
import { useCallback, useMemo } from 'react';
import { todayManila } from '@ree/shared';
import { SUBTOPIC_LIMITS, mergeSubtopics, userSubtopicErrors } from '@ree/shared/subtopics';
import { createSyncedList } from '../../hooks/createSyncedList';
import { useSyncedUserData } from '../../hooks/useSyncedUserData';
import { newEntryId } from '../exams/useOutsideScores';

const list = createSyncedList({
  endpoint: '/api/user/syllabus-subtopics',
  bulkEndpoint: '/api/user/syllabus-subtopics/bulk',
  cacheName: 'userSubtopics',
  sort: (a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
});

const premadeFrom = (res) => res?.items || [];
const noOverlay = (value) => ({ value, count: 0 });
const NOTHING = [];

const groupBy = (rows) => {
  const out = new Map();
  for (const row of rows) {
    if (!out.has(row.topicId)) out.set(row.topicId, []);
    out.get(row.topicId).push(row);
  }
  return out;
};

/** A row's full state, from what the server has for it (or nothing yet) and a change. */
function nextState(row, topicId, saved, patch) {
  const m = saved.find((s) => s.id === row.id);
  return {
    topicId,
    subtopicId: row.subtopicId,
    name: m?.name ?? null,
    hidden: !!m?.hidden,
    done: !!m?.done,
    doneOn: m?.doneOn ?? null,
    sortOrder: m?.sortOrder ?? null,
    ...patch,
  };
}

export function useSubtopics() {
  const premade = useSyncedUserData({
    endpoint: '/api/config/subtopics',
    cacheName: 'premadeSubtopics',
    fromResponse: premadeFrom,
    overlay: noOverlay,
    emptyValue: NOTHING,
  });
  const mine = list.useList();
  const saved = mine.items || NOTHING;
  const { update, addMany, remove, reload } = mine;

  const byTopic = useMemo(() => {
    const suggested = groupBy(premade.value || NOTHING);
    const own = groupBy(saved);
    const out = new Map();
    for (const topicId of new Set([...suggested.keys(), ...own.keys()])) {
      out.set(topicId, mergeSubtopics(suggested.get(topicId), own.get(topicId)));
    }
    return out;
  }, [premade.value, saved]);

  // A whole topic in one request at a time. A refused request undoes by removing
  // the rows it touched, so read the server's copy back.
  const saveMany = useCallback(async (entries) => {
    try {
      for (let i = 0; i < entries.length; i += SUBTOPIC_LIMITS.bulk) {
        await addMany(entries.slice(i, i + SUBTOPIC_LIMITS.bulk));
      }
    } catch (err) {
      reload();
      throw err;
    }
  }, [addMany, reload]);

  const actions = useMemo(() => {
    const put = (row, topicId, patch) => update(row.id, nextState(row, topicId, saved, patch));
    const each = (rows, topicId, patchOf) => saveMany(
      rows.map((row) => ({ id: row.id, ...nextState(row, topicId, saved, patchOf(row)) })),
    );
    return {
      setDone: (row, topicId, done) => put(row, topicId, { done, doneOn: done ? todayManila() : null }),
      setOff: (row, topicId, off) => put(row, topicId, { hidden: off }),
      // A suggested subtopic back at its suggested name follows Admin again.
      rename: (row, topicId, name) => {
        const trimmed = name.trim();
        return put(row, topicId, { name: row.own ? trimmed : (trimmed && trimmed !== row.suggestedName ? trimmed : null) });
      },
      addOwn: (topicId, name) => {
        const entry = { topicId, subtopicId: null, name: name.trim(), hidden: false, done: false, doneOn: null, sortOrder: null };
        const problems = userSubtopicErrors(entry);
        if (Object.keys(problems).length > 0) return Promise.reject(new Error(Object.values(problems)[0]));
        return update(newEntryId(), entry);
      },
      deleteOwn: (row) => remove(row.id),
      move: (rows, topicId, index, by) => {
        const next = rows.slice();
        [next[index], next[index + by]] = [next[index + by], next[index]];
        const position = new Map(next.map((row, i) => [row.id, i]));
        return each(next, topicId, (row) => ({ sortOrder: position.get(row.id) }));
      },
      markAll: (rows, topicId) => {
        const today = todayManila();
        return each(rows.filter((r) => !r.off && !r.done), topicId, () => ({ done: true, doneOn: today }));
      },
      startBlank: (rows, topicId) => each(rows.filter((r) => !r.own && !r.off), topicId, () => ({ hidden: true })),
      // Ticks stay. Their own subtopics switch off rather than go: they typed those.
      useSuggested: (rows, topicId) => {
        const changed = new Set(saved.map((s) => s.id));
        return each(rows.filter((r) => r.own || changed.has(r.id)), topicId, (row) => (row.own
          ? { hidden: true }
          : { hidden: false, name: null, sortOrder: null }));
      },
    };
  }, [saved, update, remove, saveMany]);

  return {
    byTopic,
    ready: premade.value != null,
    premadeStatus: premade.status,
    queuedCount: mine.queuedCount,
    actions,
  };
}

/** Test seam: forget the module-level copies between cases. */
export function __resetSubtopicsMemory() {
  list.reset();
}
