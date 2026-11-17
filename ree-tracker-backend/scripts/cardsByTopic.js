#!/usr/bin/env node
'use strict';

// A topic's formula cards (Library round, 2026-11-16), from scripts/data/cards/
// <subject>/<topic>.js into a data migration. A migration because the server has
// no shell, and merging is when the owner has seen the data:
//
//   file       live cards under their syllabus subtopic: applied directly
//   move       (optional, 2026-11-17) cards of the same subject sitting under
//              another topic: moved to this one and filed, applied directly
//   revisions  rewrites of live cards: queued in Admin › Formula cards › Review
//   retire     queued in Review too
//   drafts     new cards: queued in Review (PENDING)
//
//   node scripts/cardsByTopic.js mathematics/algebra          checks, changes nothing
//   node scripts/cardsByTopic.js mathematics/algebra --write  writes the migration
//   node scripts/cardsByTopic.js --all                        checks every data file

const fs = require('fs');
const path = require('path');
const { referenceCardCreateSchema, validateCardRules } = require('../src/schemas/referenceCardSchemas');
const { normSubtopicKey } = require('@ree/shared/subtopics');

const DATA = path.join(__dirname, 'data', 'cards');
const MIGRATIONS = path.join(__dirname, '..', 'prisma', 'migrations');
const CONTENT_KEYS = { name: 'name', symbol: 'symbol', f: 'formulaLatex', unit: 'valueUnit', d: 'description', vars: 'variables', tip: 'purposeExamTip' };

/** A draft as the card columns. */
const toContent = (card) => ({
    kind: card.kind,
    symbol: card.symbol ?? null,
    name: card.name,
    formulaLatex: card.f ?? null,
    valueUnit: (card.kind === 'constant' ? card.value : card.unit) ?? null,
    description: card.d,
    variables: card.vars ?? [],
    purposeExamTip: card.tip ?? null,
    dimensionless: !!card.dim,
});

/** A revision's changed fields, as the API names them. */
const revisionContent = (rev) => Object.fromEntries(Object.entries(CONTENT_KEYS).filter(([k]) => rev[k] !== undefined).map(([k, col]) => [col, rev[k]]));

/** Every reason the data would be refused, by the same rules as the API. */
function problemsIn(data) {
    const out = [];
    const shape = (content, label) => {
        const parsed = referenceCardCreateSchema.safeParse(content);
        const issues = parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        const rules = validateCardRules(content);
        if (issues.length || rules.length) out.push(`${label}: ${[...issues, ...rules].join(', ')}`);
    };
    const ids = new Set();
    for (const [id, subtopic] of [...data.file, ...(data.move || [])]) {
        if (ids.has(id)) out.push(`filed twice: ${id}`);
        ids.add(id);
        if (!subtopic) out.push(`no subtopic for ${id}`);
    }
    // LaTeX outside $…$ shows as source on the card.
    const bareLatex = (s) => typeof s === 'string' && /\\[a-zA-Z]/.test(s.replace(/\$[^$]*\$/g, ''));
    for (const d of [...data.drafts, ...data.revisions]) {
        for (const [field, value] of [['symbol', d.symbol], ['formula', d.f], ['unit', d.unit], ...(d.vars || []).map((x) => ['variable', x.symbol])]) {
            if (bareLatex(value)) out.push(`"${d.name || d.id}": LaTeX outside $…$ in its ${field}`);
        }
    }
    for (const d of data.drafts) {
        shape({ ...toContent(d), subject: data.subject, topic: data.topic }, `draft "${d.name}"`);
        if (!d.subtopic) out.push(`draft "${d.name}" has no subtopic`);
    }
    // A rewrite is checked on what it sets: placeholders stand in for the rest.
    for (const rev of data.revisions) {
        const c = revisionContent(rev);
        if (Object.keys(c).length === 0) out.push(`revision ${rev.id} changes nothing`);
        shape({ kind: 'formula', name: 'x', description: 'x', formulaLatex: '$x$', variables: [{ symbol: '$x$', meaning: 'x' }], ...c, subject: data.subject, topic: data.topic }, `revision ${rev.id}`);
    }
    const names = data.drafts.map((d) => d.name.toLowerCase());
    for (const n of names.filter((x, i) => names.indexOf(x) !== i)) out.push(`two drafts named "${n}"`);
    return out;
}

const q = (value) => (value === null || value === undefined ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`);
const jsonb = (value) => `${q(JSON.stringify(value))}::jsonb`;

function buildSql(data) {
    const topic = `t."name" = ${q(data.topic)} AND t."subject" = ${q(data.subject)}`;
    const subOf = (name) => `(SELECT s."id" FROM "SyllabusSubtopic" s JOIN "Topic" t ON t."id" = s."topicId" WHERE ${topic} AND s."normKey" = ${q(normSubtopicKey(name))} AND s."active")`;
    // A card under another topic of the same subject comes to this one, filed.
    const moving = (data.move || []).map(([id, subtopic, group]) => `UPDATE "ReferenceCard" SET "topicId" = (SELECT t."id" FROM "Topic" t WHERE ${topic}), "subtopicId" = ${subOf(subtopic)}, "subtopicTag" = ${q(group)}, "updatedAt" = now()
WHERE "id" = ${q(id)} AND "subject" = ${q(data.subject)} AND "status" IN ('LIVE', 'PENDING') AND EXISTS (SELECT 1 FROM "Topic" t WHERE ${topic});`);
    const filing = data.file.map(([id, subtopic, group]) => `UPDATE "ReferenceCard" SET "subtopicId" = ${subOf(subtopic)}, "subtopicTag" = ${q(group)}, "updatedAt" = now()
WHERE "id" = ${q(id)} AND "status" IN ('LIVE', 'PENDING');`);
    const revisions = data.revisions.map((rev) => `INSERT INTO "ReferenceCardRevision" ("id", "cardId", "content", "retire", "note", "status", "createdAt")
SELECT gen_random_uuid()::text, c."id", ${jsonb(revisionContent(rev))}, false, ${q(rev.note)}, 'PENDING', now() FROM "ReferenceCard" c WHERE c."id" = ${q(rev.id)} AND c."status" = 'LIVE';`);
    const retire = data.retire.map((x) => `INSERT INTO "ReferenceCardRevision" ("id", "cardId", "content", "retire", "note", "status", "createdAt")
SELECT gen_random_uuid()::text, c."id", '{}'::jsonb, true, ${q(x.why)}, 'PENDING', now() FROM "ReferenceCard" c WHERE c."id" = ${q(x.id)} AND c."status" = 'LIVE';`);
    // From the Topic row, so a database without the topic simply gets no card.
    const drafts = data.drafts.map((d) => {
        const c = toContent(d);
        return `INSERT INTO "ReferenceCard" ("id", "kind", "symbol", "name", "formulaLatex", "valueUnit", "description", "variables", "purposeExamTip", "subject", "topicId", "subtopicId", "subtopicTag", "dimensionless", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, ${q(c.kind)}, ${q(c.symbol)}, ${q(c.name)}, ${q(c.formulaLatex)}, ${q(c.valueUnit)}, ${q(c.description)}, ${jsonb(c.variables)}, ${q(c.purposeExamTip)}, ${q(data.subject)}, t."id", ${subOf(d.subtopic)}, ${q(d.group)}, ${c.dimensionless}, 'PENDING', now(), now()
FROM "Topic" t WHERE ${topic}
ON CONFLICT ("kind", "subject", "name") DO NOTHING;`;
    });
    return [
        `-- Generated by scripts/cardsByTopic.js from scripts/data/cards: change the data there and regenerate.`,
        `-- ${data.subject} › ${data.topic}: ${data.file.length} live cards under their syllabus subtopics (applied),`,
        `-- ${data.revisions.length} rewrites, ${data.retire.length} retirements and ${data.drafts.length} new cards waiting in Admin › Formula cards › Review.`,
        '',
        '-- Under their syllabus subtopics.',
        ...filing,
        '',
        // Only when there are any, so earlier migrations stay as they were generated.
        ...(moving.length ? ['-- Moved here from another topic, and filed.', ...moving, ''] : []),
        '-- Rewrites of live cards, waiting for review.',
        ...revisions,
        '',
        '-- Duplicates to retire, waiting for review.',
        ...retire,
        '',
        '-- New cards, waiting for review.',
        ...drafts,
        '',
    ].join('\n');
}

const dataFiles = () => fs.readdirSync(DATA).flatMap((subject) => fs.readdirSync(path.join(DATA, subject)).map((f) => `${subject}/${f.replace(/\.js$/, '')}`));
const load = (key) => require(path.join(DATA, `${key}.js`));
const migrationPath = (data) => path.join(MIGRATIONS, data.migration, 'migration.sql');

module.exports = { problemsIn, buildSql, dataFiles, load, migrationPath, revisionContent };

if (require.main === module) {
    const args = process.argv.slice(2);
    const keys = args.includes('--all') ? dataFiles() : args.filter((a) => !a.startsWith('--'));
    let bad = 0;
    for (const key of keys) {
        const data = load(key);
        const problems = problemsIn(data);
        console.log(`${key}: ${data.file.length} filed, ${(data.move || []).length} moved in, ${data.revisions.length} rewrites, ${data.retire.length} retired, ${data.drafts.length} new, ${problems.length} with problems.`);
        for (const p of problems) console.log(`  ${p}`);
        bad += problems.length;
        if (args.includes('--write') && problems.length === 0) {
            fs.mkdirSync(path.dirname(migrationPath(data)), { recursive: true });
            fs.writeFileSync(migrationPath(data), buildSql(data));
            console.log(`  wrote ${path.relative(process.cwd(), migrationPath(data))}`);
        }
    }
    process.exitCode = bad ? 1 : 0;
}
