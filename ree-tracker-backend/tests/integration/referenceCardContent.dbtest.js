// The card content migration against real Postgres. CI has already applied it to an
// empty database, which proves only that the SQL parses. This runs it again on rows
// shaped like production's: a live card, a card someone has rejected, and a topic.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const prisma = require('../../src/config/db');
const { REWRITES, DROPS } = require('../../scripts/data/referenceCardRewrites');
const { DRAFTS } = require('../../scripts/data/referenceCardDrafts');
const { buildMigrationSql } = require('../../scripts/referenceCardContent');

const SUBJECT = 'EE';
const rewrite = REWRITES.find((c) => c.name === 'Current Divider Rule (Two Parallel Resistors)');
const drop = DROPS.find((c) => c.name === 'Square of the Imaginary Unit');
const draft = DRAFTS.find((c) => c.name === 'Coulomb\'s Law');
const draftConstant = DRAFTS.find((c) => c.name === 'Coulomb Constant');
const ids = [rewrite.id, drop.id];
let topicId;
let createdTopic = false;

const old = (id, name) => ({ id, kind: 'formula', name, formulaLatex: '$old$', description: 'Old.', variables: [{ symbol: '$x$', meaning: 'old', unit: 'null' }], purposeExamTip: 'Old tip.', subject: SUBJECT, status: 'LIVE' });

/** Prisma's raw runner takes one statement at a time, as a migration's client doesn't. */
async function runMigration() {
  const statements = buildMigrationSql()
    .split(/;\n/)
    .map((s) => s.replace(/^(--[^\n]*\n|\s)+/g, '').trim())
    .filter(Boolean);
  for (const sql of statements) await prisma.$executeRawUnsafe(sql);
}

beforeAll(async () => {
  const topic = await prisma.topic.findFirst({ where: { subject: SUBJECT, name: draft.topic } });
  if (topic) topicId = topic.id;
  else {
    topicId = (await prisma.topic.create({ data: { subject: SUBJECT, name: draft.topic, normKey: draft.topic.trim().toLowerCase() } })).id;
    createdTopic = true;
  }
  await prisma.referenceCard.deleteMany({ where: { id: { in: ids } } });
  await prisma.referenceCard.createMany({ data: [old(rewrite.id, 'Old current divider name'), old(drop.id, 'Old imaginary name')] });
  await runMigration();
}, 120_000);

afterAll(async () => {
  await prisma.referenceCard.deleteMany({ where: { OR: [{ id: { in: ids } }, { name: { in: DRAFTS.map((c) => c.name) } }] } });
  await prisma.referenceCardVersion.deleteMany({ where: { cardId: { in: ids } } });
  if (createdTopic) await prisma.topic.delete({ where: { id: topicId } });
  await prisma.$disconnect();
});

describe('the card content migration', () => {
  it('rewrites a live card whole, LaTeX intact', async () => {
    const row = await prisma.referenceCard.findUnique({ where: { id: rewrite.id } });
    expect(row).toMatchObject({ name: rewrite.name, status: 'LIVE', formulaLatex: rewrite.f, purposeExamTip: rewrite.tip });
    expect(row.formulaLatex).toContain('\\frac{R_2}');
    expect(row.variables).toEqual(rewrite.vars);
    expect(row.variables[0].unit).toBe('$\\text{A}$');
  });

  it('keeps what the card said before, and what it says now', async () => {
    const rows = await prisma.referenceCardVersion.findMany({ where: { cardId: rewrite.id }, orderBy: { createdAt: 'asc' } });
    expect(rows.map((r) => r.action)).toEqual(['EDITED', 'EDITED']);
    expect(rows[0].snapshot).toMatchObject({ name: 'Old current divider name', purposeExamTip: 'Old tip.' });
    expect(rows[1].snapshot).toMatchObject({ name: rewrite.name });
    expect(rows[0].snapshot).not.toHaveProperty('status');
  });

  it('retires a card by rejecting it, so the row and its history stay', async () => {
    const row = await prisma.referenceCard.findUnique({ where: { id: drop.id } });
    expect(row).toMatchObject({ status: 'REJECTED', reviewNote: drop.why });
    const rows = await prisma.referenceCardVersion.findMany({ where: { cardId: drop.id } });
    expect(rows.map((r) => r.action).sort()).toEqual(['EDITED', 'REJECTED']);
  });

  it('adds a new card only as pending, under its real topic', async () => {
    const row = await prisma.referenceCard.findFirst({ where: { name: draft.name, subject: SUBJECT } });
    expect(row).toMatchObject({ status: 'PENDING', topicId, subtopicTag: draft.tag, kind: 'formula' });
    const versions = await prisma.referenceCardVersion.findMany({ where: { cardId: row.id } });
    expect(versions.map((r) => r.action)).toEqual(['SUBMITTED']);
    const constant = await prisma.referenceCard.findFirst({ where: { name: draftConstant.name, subject: SUBJECT } });
    expect(constant).toMatchObject({ status: 'PENDING', kind: 'constant', valueUnit: draftConstant.value, formulaLatex: null });
  });

  it('leaves out a card whose topic this database doesn\'t have', async () => {
    const missing = DRAFTS.find((c) => c.topic === 'Electronics 1 and 2');
    const topic = await prisma.topic.findFirst({ where: { subject: 'EE', name: missing.topic } });
    const row = await prisma.referenceCard.findFirst({ where: { name: missing.name } });
    expect(row === null).toBe(topic === null);
  });

  it('leaves a card alone that isn\'t live any more', async () => {
    await prisma.referenceCard.update({ where: { id: rewrite.id }, data: { status: 'REJECTED', name: 'Rejected since' } });
    await runMigration();
    const row = await prisma.referenceCard.findUnique({ where: { id: rewrite.id } });
    expect(row).toMatchObject({ name: 'Rejected since', status: 'REJECTED' });
  }, 120_000);
});
