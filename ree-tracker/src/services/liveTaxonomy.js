// src/services/liveTaxonomy.js
// Pull the live topic taxonomy (GET /api/config/tos — the server's Topic table)
// into the store. The store starts from the offline snapshot in
// config/constants.js and persists whatever it last held, so anything that
// writes topic labels (the Library's AI ingestion, manual add, review edits)
// must see the live list — a stale one mints labels that resolve to no Topic.
import { fetchDynamicTOS } from './dbQueries';
import { useStore } from '../store/useStore';

const isUsableTOS = (tos) =>
  !!tos && typeof tos === 'object' && !Array.isArray(tos)
  && Object.values(tos).some((topics) => Array.isArray(topics) && topics.length > 0);

/**
 * Fetch the live taxonomy and apply it. Resolves to the map, or null (store
 * untouched) on a failed fetch or an empty/malformed payload. Never rejects —
 * fetchDynamicTOS already swallows its own errors.
 */
export async function refreshLiveTOS() {
  const tos = await fetchDynamicTOS();
  if (!isUsableTOS(tos)) return null;
  useStore.getState().setDynamicTOS(tos);
  return tos;
}
