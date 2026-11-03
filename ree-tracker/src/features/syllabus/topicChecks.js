// src/features/syllabus/topicChecks.js
//
// Read, Watched and Drilled: one icon each, on the tile, in the sheet and in the legend.
import { BookOpen, Crosshair, Play } from '../../components/ui/icons';

export const CHECKS = [
  { key: 'read', word: 'read', label: 'Read', icon: BookOpen },
  { key: 'watched', word: 'watched', label: 'Watched', icon: Play },
  { key: 'drilled', word: 'drilled', label: 'Drilled', icon: Crosshair },
];
