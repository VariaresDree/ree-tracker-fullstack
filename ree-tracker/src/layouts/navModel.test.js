import { describe, it, expect } from 'vitest';
import { PRIMARY_NAV, activeNavId } from './navModel';

// One navigation model drives the sidebar, the phone bar and the active state.
// The old shell kept two hand-written lists that disagreed (Library and
// Materials missing from the phone bar, Profile missing from the sidebar), and
// never lit /simulator.
describe('navModel', () => {
    it('has exactly the five learner destinations, in order', () => {
        expect(PRIMARY_NAV.map((n) => n.label)).toEqual(['Today', 'Practice', 'Exams', 'Progress', 'Library']);
        expect(PRIMARY_NAV.map((n) => n.to)).toEqual(['/', '/practice', '/exams', '/progress', '/library']);
    });

    it.each([
        ['/', 'today'],
        ['/diagnostic', 'today'],
        ['/practice', 'practice'],
        ['/review', 'practice'],
        ['/exams', 'exams'],
        ['/simulator', 'exams'],
        ['/gauntlet/3', 'exams'],
        ['/battle/ABC123', 'exams'],
        ['/arena', 'exams'],
        ['/progress', 'progress'],
        ['/library', 'library'],
        ['/materials', 'library'],
        ['/account', 'account'],
        ['/profile', 'account'],
        ['/admin', 'admin'],
    ])('%s lights %s', (path, id) => {
        expect(activeNavId(path)).toBe(id);
    });

    it('matches whole path segments, never prefixes', () => {
        expect(activeNavId('/practiceX')).toBeNull();
        expect(activeNavId('/exams-old')).toBeNull();
        expect(activeNavId('/libraryish/x')).toBeNull();
    });
});
