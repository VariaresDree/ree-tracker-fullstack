// src/features/materials/sortNames.js
//
// Handouts and quiz files in the order people number them (Terms-2 before
// Terms-10), and the sort a learner picked, remembered on this device.
const KEY = 'ree:handouts-sort';

export const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

const newestFirst = (a, b) => (new Date(b.createdAt) - new Date(a.createdAt)) || byName(a, b);

export const sortItems = (items, sortBy) => [...items].sort(sortBy === 'date' ? newestFirst : byName);

export function readSort() {
  try { return localStorage.getItem(KEY) === 'date' ? 'date' : 'name'; } catch { return 'name'; }
}

export function writeSort(sortBy) {
  try { localStorage.setItem(KEY, sortBy); } catch { /* a convenience */ }
}
