// src/features/exams/battleModes.js
//
// Battle formats, named after the mock-board profiles they match
// (features/board-simulator/profiles.js): a "One subject (PRC clock)" battle
// and mock board are the same sitting.
import { SIM_PROFILES } from '../board-simulator/profiles';

const profile = (id) => SIM_PROFILES.find((p) => p.id === id);

export const BATTLE_MODES = [
  { id: 'custom', profile: 'custom', description: 'Pick the item count and time limit yourself.' },
  { id: 'prc', profile: 'prc_subject' },
  { id: 'blended', profile: 'prc_blended' },
].map((m) => ({
  ...m,
  icon: profile(m.profile).icon,
  name: profile(m.profile).name,
  description: m.description || profile(m.profile).description,
}));

/** A battle's format in a word or two, from its saved config: "EE", "Full mock". */
export function battleLabel(config) {
  if (!config) return 'Battle';
  if (config.mode === 'blended') return 'Full mock';
  return config.subject || 'Battle';
}

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 11 → "11th", 22 → "22nd". */
export function ordinal(n) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
}

/** Where a player finished: "2nd of 3". */
export const placeLabel = (placement, players) => `${ordinal(placement)} of ${players}`;
