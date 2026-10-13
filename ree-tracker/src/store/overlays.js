// src/store/overlays.js
//
// Which overlays are open, for the ones that have to make room for each
// other. Transient and kept apart from useStore: that store is persisted, and
// every set() there writes the whole state to IndexedDB.
//
// scratchpadOpen: the floating Pomodoro pill hides while the Scratchpad is
// open (both sat at z-[70], and on a phone the pill covered the sheet).
import { create } from 'zustand';

export const useOverlays = create((set) => ({
  scratchpadOpen: false,
  setScratchpadOpen: (open) => set({ scratchpadOpen: !!open }),
}));
