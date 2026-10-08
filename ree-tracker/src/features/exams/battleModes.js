// src/features/exams/battleModes.js
//
// Battle formats, named after the mock-board profiles they match
// (features/board-simulator/profiles.js): a "PRC Standard" battle and a "PRC
// Standard" mock board are the same sitting.
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
