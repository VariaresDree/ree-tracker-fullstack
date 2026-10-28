import { describe, it, expect, vi, afterEach } from 'vitest';

// The topics flagged "to improve" on outside scores, as the study planner
// reads them: the last 45 days only, keyed by topic name, with the newest
// entry that flagged each.
const prisma = require('../src/config/db');
const { loadFlaggedTopics } = require('../src/services/selfReportSignals');

afterEach(() => vi.restoreAllMocks());

describe('loadFlaggedTopics', () => {
    it('counts flags per topic over the window and names the newest paper', async () => {
        const findMany = vi.spyOn(prisma.outsideScore, 'findMany').mockResolvedValue([
            { title: 'PB 2', takenOn: '2026-10-20', improveTopicIds: ['t1'] },
            { title: 'PB 1', takenOn: '2026-10-01', improveTopicIds: ['t1', 't2', 'gone'] },
        ]);
        vi.spyOn(prisma.topic, 'findMany').mockResolvedValue([{ id: 't1', name: 'Machines ' }, { id: 't2', name: 'Protection' }]);
        const out = await loadFlaggedTopics('uid', '2026-10-28');
        expect(findMany.mock.calls[0][0].where).toEqual({ userId: 'uid', takenOn: { gte: '2026-09-13' }, improveTopicIds: { isEmpty: false } });
        expect([...out.entries()]).toEqual([
            ['machines', { flags: 2, flaggedBy: 'PB 2' }],
            ['protection', { flags: 1, flaggedBy: 'PB 1' }],
        ]);
    });

    it('asks for no topics when nothing is flagged', async () => {
        vi.spyOn(prisma.outsideScore, 'findMany').mockResolvedValue([]);
        const topics = vi.spyOn(prisma.topic, 'findMany');
        expect((await loadFlaggedTopics('uid', '2026-10-28')).size).toBe(0);
        expect(topics).not.toHaveBeenCalled();
    });
});
