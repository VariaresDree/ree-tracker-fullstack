import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Who may replace a live question, and what a reply can't change. What the SQL
// does to past answers is in tests/integration/questionReplace.dbtest.js.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');
const { questionContentHash, replacePlan } = require('@ree/shared');
const questionRoutes = require('../src/routes/questionRoutes');

const ADMIN = 'uid-admin';
const USER = 'uid-user';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const app = () => { const a = express(); a.use(express.json()); a.use('/api/questions', questionRoutes); return a; };

const before = { text: 'Stem?', options: ['1 A', '2 A', '3 A', '4 A'], answer: '2 A', fixedExplanation: 'Old.' };
const after = (over = {}) => ({ ...before, hash: questionContentHash(before), ...over });

describe('replacePlan', () => {
  it('nothing different is unchanged', () => {
    expect(replacePlan(before, after())).toMatchObject({ refusal: null, unchanged: true, keyChanged: false });
  });

  it('names what changed', () => {
    expect(replacePlan(before, after({ fixedExplanation: 'New.' }))).toMatchObject({ refusal: null, explanationChanged: true, stemChanged: false, optionsChanged: false, unchanged: false });
    expect(replacePlan(before, after({ text: 'New?' }))).toMatchObject({ stemChanged: true });
  });

  it('a reworded key in its own slot is not a key change', () => {
    const options = ['1 A', '$2\\ \\text{A}$', '3 A', '4 A'];
    expect(replacePlan(before, after({ options, answer: options[1] }))).toMatchObject({ refusal: null, optionsChanged: true, keyChanged: false, oldKey: 1, newKey: 1 });
  });

  it('a key in another slot is a key change', () => {
    expect(replacePlan(before, after({ answer: '3 A' }))).toMatchObject({ refusal: null, keyChanged: true, oldKey: 1, newKey: 2 });
  });

  it('a key that was never an option counts as a key change', () => {
    expect(replacePlan({ ...before, answer: 'Lost' }, { ...after(), hash: questionContentHash({ ...before, answer: 'Lost' }), answer: '2 A' })).toMatchObject({ keyChanged: true, oldKey: -1 });
  });

  it.each([
    ['stale', { hash: 'old' }],
    ['option-count-changed', { options: ['1 A', '2 A', '3 A'] }],
    ['options-reordered', { options: ['2 A', '1 A', '3 A', '4 A'] }],
    ['options-reordered', { options: ['$2$ A', '1 A', '3 A', '4 A'] }],
    ['key-not-an-option', { answer: 'Nope' }],
  ])('refuses as %s', (refusal, over) => {
    expect(replacePlan(before, after(over)).refusal).toBe(refusal);
  });

  it('notices a rewording that would change the shuffle', () => {
    const options = ['1 A', '2 A', '3 A', 'All of the above'];
    expect(replacePlan(before, after({ options })).changesReviewOrder).toBe(true);
    expect(replacePlan(before, after()).changesReviewOrder).toBe(false);
  });
});

describe('routes', () => {
  beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: ADMIN });
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({ role: where.id === ADMIN ? 'ADMIN' : 'USER' }));
    invalidateRole(ADMIN);
    invalidateRole(USER);
    vi.spyOn(prisma.idempotencyRecord, 'create').mockResolvedValue({});
    vi.spyOn(prisma.idempotencyRecord, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.idempotencyRecord, 'update').mockResolvedValue({});
  });
  afterEach(() => vi.restoreAllMocks());

  const item = { id: 'q1', hash: 'h', text: 'Stem?', options: ['a', 'b'], answer: 'a', fixedExplanation: 'x' };

  it.each([
    ['get', '/api/questions/for-checking', undefined],
    ['post', '/api/questions/replace-preview', { ids: ['q1'] }],
    ['post', '/api/questions/replace-bulk', { items: [item] }],
  ])('%s %s refuses a learner', async (method, url, body) => {
    const update = vi.spyOn(prisma.question, 'update');
    const res = await request(app())[method](url).set(as(USER)).send(body);
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it('takes at most 25 at a time', async () => {
    const res = await request(app()).post('/api/questions/replace-bulk').set(as(ADMIN)).send({ items: Array.from({ length: 26 }, (_, i) => ({ ...item, id: `q${i}` })) });
    expect(res.status).toBe(400);
  });

  it('skips a question in a running battle: its final scores re-grade against the live key', async () => {
    vi.spyOn(prisma.question, 'findMany').mockResolvedValue([{ id: 'q1', ...before, subtopic: 'T', subject: 'EE' }]);
    vi.spyOn(prisma.battle, 'findMany').mockResolvedValue([{ id: 'b', status: 'ACTIVE', questions: [{ id: 'q1' }], startedAt: new Date(), timeLimitSecs: 3600, createdAt: new Date() }]);
    const tx = vi.spyOn(prisma, '$transaction');
    const res = await request(app()).post('/api/questions/replace-bulk').set(as(ADMIN)).send({ items: [{ ...before, id: 'q1', hash: questionContentHash(before), fixedExplanation: 'New.' }] });
    expect(res.body.skipped).toEqual([{ id: 'q1', reason: 'in-battle' }]);
    expect(tx).not.toHaveBeenCalled();
  });
});
