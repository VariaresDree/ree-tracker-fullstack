#!/usr/bin/env node
/*
 * Seed the SyllabusWeight config table with the current PRC REE board-exam
 * Table-of-Specifications subject weights. Idempotent (upsert) — safe to re-run.
 * Run once after deploying the SyllabusWeight migration; edit the rows (or this
 * seed) if the PRC weighting changes.
 *
 * Usage: node scripts/seedSyllabusWeights.js
 */
require('dotenv').config();
const prisma = require('../src/config/db');

// Canonical subjects + PRC weights (Math 25% / ESAS 30% / EE 45%). Must sum to 1.
const WEIGHTS = [
  { subject: 'Mathematics', weight: 0.25, label: 'Mathematics' },
  { subject: 'ESAS', weight: 0.30, label: 'Engineering Sciences and Allied Subjects' },
  { subject: 'EE', weight: 0.45, label: 'Electrical Engineering Professional Subjects' },
];

async function main() {
  const sum = WEIGHTS.reduce((s, w) => s + w.weight, 0);
  if (Math.abs(sum - 1) > 1e-6) throw new Error(`Syllabus weights must sum to 1 (got ${sum})`);

  for (const w of WEIGHTS) {
    await prisma.syllabusWeight.upsert({
      where: { subject: w.subject },
      update: { weight: w.weight, label: w.label },
      create: w,
    });
    console.log(`[seedSyllabusWeights]  ${w.subject} = ${w.weight}`);
  }
  console.log('[seedSyllabusWeights] done');
}

main()
  .catch((err) => {
    console.error('[seedSyllabusWeights] failed', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
