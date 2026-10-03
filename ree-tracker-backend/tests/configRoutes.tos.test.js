import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// PUT /api/config/tos — a respelling must reach every label that copies
// Topic.name. Same harness as questionRoutes.authz.test.js: firebase-admin/auth
// is patched before the router is required, and the Prisma singleton is spied
// on. The transaction runs against a fake `tx` that records the order of calls,
// because the merge must read history only AFTER the Topic row is renamed.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');
const questionBankCache = require('../src/services/questionBankCache');
const configRoutes = require('../src/routes/configRoutes');

const ADMIN_UID = 'uid-admin';
const USER_UID = 'uid-user';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

const topic = (id, name, sortOrder = 0, extra = {}) => ({
  id, subject: 'EE', name, normKey: name.trim().toLowerCase(), aliases: [], sortOrder, active: true, ...extra,
});
const EC2 = topic('t-ec2', 'electric circuits 2', 0);
const MACH = topic('t-mach', 'DC Machines', 1);

// rows: what the UserTopicPerformance reads return; attempts: history.
function fakeTx({ rows = [], attempts = [] } = {}) {
  const log = [];
  const step = (name, impl = async () => ({ count: 0 })) => vi.fn(async (...args) => { log.push(name); return impl(...args); });
  const tx = {
    log,
    topic: { createMany: step('topic.createMany'), update: step('topic.update', async () => ({})), updateMany: step('topic.updateMany') },
    question: { updateMany: step('question.updateMany', async () => ({ count: 7 })) },
    userTopicPerformance: {
      findMany: step('utp.findMany', async ({ where }) => rows.filter((r) => where.topic.in.includes(r.topic)
        && (!where.userId || where.userId.in.includes(r.userId)))),
      updateMany: step('utp.updateMany', async ({ where }) => ({ count: where.id.in.length })),
      upsert: step('utp.upsert', async () => ({})),
      deleteMany: step('utp.deleteMany', async ({ where }) => ({ count: where.id.in.length })),
    },
    questionAttempt: { findMany: step('attempt.findMany', async () => attempts) },
    $queryRaw: step('lock', async () => []),
  };
  return tx;
}

let app;
let tx;
const useTx = (t) => {
  tx = t;
  vi.spyOn(prisma, '$transaction').mockImplementation(async (fn) => fn(tx));
};

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use('/api/config', configRoutes);
  verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
  vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: ADMIN_UID });
  vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({ role: where.id === ADMIN_UID ? 'ADMIN' : 'USER' }));
  invalidateRole(ADMIN_UID);
  invalidateRole(USER_UID);
  vi.spyOn(prisma.topic, 'findMany').mockResolvedValue([EC2, MACH]);
  useTx(fakeTx());
});

afterEach(() => {
  vi.restoreAllMocks();
});

const save = (body, uid = ADMIN_UID) => request(app).put('/api/config/tos').set(as(uid)).send(body);

describe('PUT /api/config/tos — a respelled topic carries its new name onto its labels', () => {
  it('relabels the topic\'s questions, after renaming the Topic row, in the same transaction', async () => {
    const res = await save({ EE: ['Electric Circuits 2', 'DC Machines'] });

    expect(res.status).toBe(200);
    expect(tx.topic.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 't-ec2' }, data: expect.objectContaining({ name: 'Electric Circuits 2' }) }));
    expect(tx.question.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.question.updateMany).toHaveBeenCalledWith({ where: { topicId: 't-ec2' }, data: { subtopic: 'Electric Circuits 2' } });
    expect(tx.log.indexOf('topic.update')).toBeLessThan(tx.log.indexOf('question.updateMany'));
    expect(res.body.relabeled).toMatchObject({ questions: 7 });
  });

  it('renames a learner\'s old-spelling rollup row in place when they have none under the new spelling', async () => {
    useTx(fakeTx({ rows: [{ id: 'r1', userId: 'u1', topic: 'electric circuits 2', attempts: 4, correct: 2, totalTime: 40 }] }));

    const res = await save({ EE: ['Electric Circuits 2', 'DC Machines'] });

    expect(res.status).toBe(200);
    expect(tx.userTopicPerformance.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['r1'] } }, data: { topic: 'Electric Circuits 2' } });
    expect(tx.questionAttempt.findMany).not.toHaveBeenCalled();
    expect(res.body.relabeled).toMatchObject({ rollupsRenamed: 1, rollupsMerged: 0 });
  });

  it('merges into an existing new-spelling row from history, under the learner\'s lock', async () => {
    const EC2_Q = { topicId: 't-ec2', topic: { name: 'Electric Circuits 2', subject: 'EE' } };
    const answered = (isCorrect, recordedAs) => ({ userId: 'u1', isCorrect, subject: 'EE', subtopic: recordedAs, timeSpentMs: 10_000, question: EC2_Q });
    useTx(fakeTx({
      rows: [
        { id: 'r-new', userId: 'u1', topic: 'Electric Circuits 2', attempts: 3, correct: 2, totalTime: 30 },
        { id: 'r-old', userId: 'u1', topic: 'electric circuits 2', attempts: 2, correct: 1, totalTime: 20 },
      ],
      attempts: [
        answered(true, 'Electric Circuits 2'), answered(true, 'Electric Circuits 2'), answered(false, 'Electric Circuits 2'),
        answered(true, 'electric circuits 2'), answered(false, 'electric circuits 2'),
      ],
    }));

    const res = await save({ EE: ['Electric Circuits 2', 'DC Machines'] });

    expect(res.status).toBe(200);
    // telemetry's per-user lock, taken before history is read
    expect(tx.$queryRaw.mock.calls[0][0].join('?')).toMatch(/FOR UPDATE/);
    expect(tx.log.indexOf('topic.update')).toBeLessThan(tx.log.indexOf('attempt.findMany'));
    expect(tx.log.indexOf('lock')).toBeLessThan(tx.log.indexOf('attempt.findMany'));
    expect(tx.userTopicPerformance.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_topic: { userId: 'u1', topic: 'Electric Circuits 2' } },
      update: expect.objectContaining({ attempts: 5, correct: 3, totalTime: 50, masteryN: 5 }),
    }));
    expect(tx.userTopicPerformance.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', id: { in: ['r-old'] } } });
    expect(tx.userTopicPerformance.updateMany).not.toHaveBeenCalled();
    expect(res.body.relabeled).toMatchObject({ rollupsRenamed: 0, rollupsMerged: 1, rollupsKept: 0 });
  });

  it('drops the cached question-bank aggregates, whose checksum covers subtopic', async () => {
    const invalidate = vi.spyOn(questionBankCache, 'invalidateAll');
    await save({ EE: ['Electric Circuits 2', 'DC Machines'] });
    expect(invalidate).toHaveBeenCalled();
  });

  it('relabels nothing on a save that keeps every spelling', async () => {
    const res = await save({ EE: ['DC Machines', 'electric circuits 2'] }); // reorder only

    expect(res.status).toBe(200);
    expect(tx.topic.update).toHaveBeenCalledTimes(2);
    expect(tx.question.updateMany).not.toHaveBeenCalled();
    expect(tx.userTopicPerformance.findMany).not.toHaveBeenCalled();
  });

  it('refuses a non-admin before anything is written', async () => {
    const res = await save({ EE: ['Electric Circuits 2'] }, USER_UID);
    expect(res.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
