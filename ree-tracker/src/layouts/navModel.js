// src/layouts/navModel.js
//
// The app's destinations, stated once. The sidebar (desktop), the bottom bar
// (phone) and the active state all read from here. The old shell kept two
// hand-written lists that disagreed — Library and Materials were missing from
// the phone bar, Profile from the sidebar — and never lit /simulator.
//
// `segments` are the first path segments that belong to a destination, so the
// exam runners (/simulator, /gauntlet/:n, /battle/:id) light Exams and the old
// URLs (redirected) light where they now land.
import { CalendarCheck, BrainCircuit, Zap, TrendingUp, Library, User, ShieldCheck } from '../components/ui/icons';

export const PRIMARY_NAV = [
  { id: 'today', to: '/', label: 'Today', icon: CalendarCheck, desc: 'Your next step and today’s target', segments: ['', 'diagnostic'] },
  { id: 'practice', to: '/practice', label: 'Practice', icon: BrainCircuit, desc: 'Questions, flashcards, due reviews', segments: ['practice', 'review'] },
  { id: 'exams', to: '/exams', label: 'Exams', icon: Zap, desc: 'Mock boards, Gauntlet, battles', segments: ['exams', 'simulator', 'gauntlet', 'battle', 'arena'] },
  { id: 'progress', to: '/progress', label: 'Progress', icon: TrendingUp, desc: 'Readiness, topics, study plan', segments: ['progress'] },
  { id: 'library', to: '/library', label: 'Library', icon: Library, desc: 'Formula cards, handouts, bookmarks', segments: ['library', 'materials'] },
];

export const ACCOUNT_NAV = { id: 'account', to: '/account', label: 'Account', icon: User, segments: ['account', 'profile'] };
export const ADMIN_NAV = { id: 'admin', to: '/admin', label: 'Admin', icon: ShieldCheck, segments: ['admin'] };

const ALL = [...PRIMARY_NAV, ACCOUNT_NAV, ADMIN_NAV];

/** The destination a path belongs to — by its whole first segment, never a prefix. */
export function activeNavId(pathname = '/') {
  const segment = String(pathname).split('/')[1] || '';
  const hit = ALL.find((item) => item.segments.includes(segment));
  return hit ? hit.id : null;
}
