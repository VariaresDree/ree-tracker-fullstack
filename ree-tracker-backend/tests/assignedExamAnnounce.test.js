import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Learners who turned on notifications hear of an exam the first time it is
// published: not for a draft, a re-save, a locked or a closed exam, and a
// scheduled one says when it opens.

const prisma = require('../src/config/db');
const pushService = require('../src/services/pushService');
const assignedExams = require('../src/services/assignedExams');

const ids = ['q1', 'q2', 'q3', 'q4', 'q5'];
const input = (over = {}) => ({ title: 'EE prelim', description: null, questionIds: ids, timeLimitSecs: 1800, status: 'published', opensAt: null, closesAt: null, ...over });
const flush = () => new Promise((r) => setTimeout(r, 0));

let send;
beforeEach(() => {
    vi.spyOn(prisma.question, 'findMany').mockImplementation(async ({ where }) => where.id.in.map((id) => ({ id, subject: 'EE' })));
    vi.spyOn(prisma.assignedExam, 'create').mockImplementation(async ({ data }) => ({ id: 'x1', locked: false, ...data }));
    vi.spyOn(prisma.assignedExam, 'update').mockImplementation(async ({ data }) => ({ id: 'x1', locked: false, ...data }));
    vi.spyOn(prisma.deviceToken, 'findMany').mockResolvedValue([{ userId: 'ana' }, { userId: 'ben' }]);
    send = vi.spyOn(pushService, 'sendToUser').mockResolvedValue({ sent: 1 });
});

afterEach(() => vi.restoreAllMocks());

describe('announcing an assigned exam', () => {
    it('tells each learner with notifications on, once, when it is first published', async () => {
        await assignedExams.create(input(), 'admin');
        await flush();
        expect(prisma.deviceToken.findMany.mock.calls[0][0].where).toEqual({ user: { role: 'USER' } });
        expect(send.mock.calls.map((c) => c[0])).toEqual(['ana', 'ben']);
        expect(send.mock.calls[0][1]).toEqual({
            title: 'New exam from your reviewer',
            body: 'EE prelim · 5 items. Take it on Exams › Assigned.',
            data: { route: '/exams?tab=assigned' },
        });
    });

    it('says nothing for a draft, or for a re-save of one already published', async () => {
        await assignedExams.create(input({ status: 'draft' }), 'admin');
        vi.spyOn(prisma.assignedExam, 'findUnique').mockResolvedValue({ publishedAt: new Date('2026-11-24T00:00:00Z') });
        await assignedExams.update('x1', input());
        await flush();
        expect(send).not.toHaveBeenCalled();
    });

    it('tells them when a draft is published later', async () => {
        vi.spyOn(prisma.assignedExam, 'findUnique').mockResolvedValue({ publishedAt: null });
        await assignedExams.update('x1', input());
        await flush();
        expect(send).toHaveBeenCalledTimes(2);
    });

    it('a scheduled exam says when it opens, in Philippine time', async () => {
        await assignedExams.create(input({ opensAt: new Date('2099-11-28T00:00:00Z') }), 'admin');
        await flush();
        expect(send.mock.calls[0][1].body).toBe('EE prelim · 5 items. Opens Sat, Nov 28, 8:00 AM.');
    });

    it('a closed exam says nothing', async () => {
        await assignedExams.create(input({ closesAt: new Date('2000-01-01T00:00:00Z') }), 'admin');
        await flush();
        expect(send).not.toHaveBeenCalled();
    });

    it('a failed lookup never fails the save', async () => {
        prisma.deviceToken.findMany.mockRejectedValue(new Error('db down'));
        await expect(assignedExams.create(input(), 'admin')).resolves.toMatchObject({ id: 'x1' });
        await flush();
    });
});

describe('a push names the kind of set', () => {
    it('says quiz, problem set or practice set', async () => {
        await assignedExams.create(input({ kind: 'problem-set' }), 'admin');
        await flush();
        expect(send.mock.calls[0][1].title).toBe('New problem set from your reviewer');
    });
});
