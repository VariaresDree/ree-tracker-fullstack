#!/usr/bin/env node
/*
 * Archive, then trim, the question bank's edit history. Two thirds of the
 * database (2026-11-10: 101 of 152 MB) was history the app never reads again.
 *
 * What goes (nothing has a foreign key to these rows):
 *   QuestionVersion
 *     - a question's versions older than its newest KEEP (2), except
 *       EXTERNAL_FIX ones: grading reads those to accept an answer given in a
 *       question's old wording (questionReplace.translateStaleAnswers);
 *     - the history rows of a review copy that was approved (reviewId only,
 *       no questionId). The live question has its own versions.
 *   QuestionPendingReview
 *     - APPROVED copies reviewed more than DAYS (30) ago. Import's duplicate
 *       check reads only PENDING rows (questionImport.js).
 *
 * Three steps, each run on purpose:
 *   node scripts/archiveHistory.js                          what would go (no writes)
 *   node scripts/archiveHistory.js --archive=FILE.jsonl.gz  write every such row to FILE, and FILE.json
 *   node scripts/archiveHistory.js --delete --archive=FILE.jsonl.gz --confirm=TRIM
 *                                                           delete exactly the rows in FILE
 * The delete reads the ids from the archive, not from the rules again, so only
 * what is safely in the file can go; it checks the file against its .json
 * first (row counts and a SHA-256). Running it twice deletes nothing more.
 * Afterwards, VACUUM FULL "QuestionVersion", "QuestionPendingReview"; in
 * Supabase's SQL editor gives the space back.
 */
'use strict';

require('dotenv').config();
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');
const readline = require('readline');

const KEEP = 2;
const DAYS = 30;
const CHUNK = 500;
const TABLES = ['QuestionVersion', 'QuestionPendingReview'];
const accessor = { QuestionVersion: 'questionVersion', QuestionPendingReview: 'questionPendingReview' };

// Static SQL, every value bound (scripts/audit-sql-interpolation.js).
const VERSION_IDS = `SELECT id FROM (
    SELECT v.id, v."questionId", v."reviewId", v.action,
           row_number() OVER (PARTITION BY v."questionId" ORDER BY v."createdAt" DESC, v.id DESC) AS rn
    FROM "QuestionVersion" v
) r
WHERE r.action <> 'EXTERNAL_FIX' AND (
    (r."questionId" IS NOT NULL AND r.rn > $1)
    OR (r."questionId" IS NULL AND r."reviewId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "QuestionPendingReview" p WHERE p.id = r."reviewId" AND p.status = 'APPROVED'))
)
ORDER BY id`;
const REVIEW_IDS = `SELECT id FROM "QuestionPendingReview"
WHERE status = 'APPROVED' AND coalesce("reviewedAt", "createdAt") < now() - make_interval(days => $1)
ORDER BY id`;

function parseArgs(argv) {
    return argv.reduce((acc, a) => {
        const [k, ...v] = a.replace(/^--/, '').split('=');
        acc[k] = v.length ? v.join('=') : true;
        return acc;
    }, {});
}

/** The ids each table would lose, by the rules above. */
async function candidateIds(prisma) {
    const [versions, reviews] = await Promise.all([
        prisma.$queryRawUnsafe(VERSION_IDS, KEEP),
        prisma.$queryRawUnsafe(REVIEW_IDS, DAYS),
    ]);
    return { QuestionVersion: versions.map((r) => r.id), QuestionPendingReview: reviews.map((r) => r.id) };
}

const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, (i + 1) * n));

const sha256 = (file) => new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(file).on('data', (d) => hash.update(d)).on('end', () => resolve(hash.digest('hex'))).on('error', reject);
});

/** Every candidate row, whole, as one JSON line each, gzipped; and FILE.json beside it. */
async function writeArchive(prisma, file, ids) {
    if (fs.existsSync(file)) throw new Error(`${file} already exists. Pick a new name; an archive is never overwritten.`);
    const gzip = zlib.createGzip();
    const out = fs.createWriteStream(file);
    const done = new Promise((resolve, reject) => { out.on('finish', resolve); out.on('error', reject); gzip.on('error', reject); });
    gzip.pipe(out);
    const write = (obj) => new Promise((resolve) => { if (gzip.write(`${JSON.stringify(obj)}\n`)) resolve(); else gzip.once('drain', resolve); });

    await write({ archive: 'ree-question-history', version: 1, createdAt: new Date().toISOString(), keep: KEEP, days: DAYS });
    const counts = {};
    for (const table of TABLES) {
        counts[table] = 0;
        for (const part of chunks(ids[table], CHUNK)) {
            const rows = await prisma[accessor[table]].findMany({ where: { id: { in: part } } });
            for (const row of rows) { await write({ table, row }); counts[table] += 1; }
        }
    }
    gzip.end();
    await done;
    const manifest = { file: file.split(/[\\/]/).pop(), counts, sha256: await sha256(file), bytes: fs.statSync(file).size };
    fs.writeFileSync(`${file}.json`, `${JSON.stringify(manifest, null, 2)}\n`);
    return manifest;
}

/** The ids in an archive, by table, checked against its .json. */
async function readArchive(file) {
    if (!fs.existsSync(file) || !fs.existsSync(`${file}.json`)) throw new Error(`Needs ${file} and ${file}.json, written by --archive.`);
    const manifest = JSON.parse(fs.readFileSync(`${file}.json`, 'utf8'));
    if ((await sha256(file)) !== manifest.sha256) throw new Error(`${file} doesn't match its .json (SHA-256). Nothing deleted.`);
    const ids = Object.fromEntries(TABLES.map((t) => [t, []]));
    const lines = readline.createInterface({ input: fs.createReadStream(file).pipe(zlib.createGunzip()), crlfDelay: Infinity });
    let header = null;
    for await (const line of lines) {
        if (!line) continue;
        const obj = JSON.parse(line);
        if (!header) { header = obj; continue; }
        if (!TABLES.includes(obj.table) || !obj.row?.id) throw new Error(`Unexpected line in ${file}. Nothing deleted.`);
        ids[obj.table].push(obj.row.id);
    }
    if (header?.archive !== 'ree-question-history') throw new Error(`${file} isn't a history archive. Nothing deleted.`);
    for (const t of TABLES) {
        if (ids[t].length !== manifest.counts?.[t]) throw new Error(`${file} holds ${ids[t].length} ${t} rows, its .json says ${manifest.counts?.[t]}. Nothing deleted.`);
    }
    return ids;
}

/** Deletes exactly the archived ids. */
async function deleteArchived(prisma, ids) {
    const deleted = {};
    for (const table of TABLES) {
        deleted[table] = 0;
        for (const part of chunks(ids[table], CHUNK)) {
            deleted[table] += (await prisma[accessor[table]].deleteMany({ where: { id: { in: part } } })).count;
        }
    }
    return deleted;
}

async function run(argv, prisma, log = console.log) {
    const args = parseArgs(argv);
    if (args.delete) {
        if (args.confirm !== 'TRIM') throw new Error('Refusing to delete without --confirm=TRIM.');
        if (typeof args.archive !== 'string') throw new Error('--delete needs --archive=FILE, the archive this deletes.');
        const ids = await readArchive(args.archive);
        log(`Archive checked: ${ids.QuestionVersion.length} versions, ${ids.QuestionPendingReview.length} review copies.`);
        const deleted = await deleteArchived(prisma, ids);
        log('Deleted:', deleted);
        log('Then, in Supabase › SQL editor: VACUUM FULL "QuestionVersion", "QuestionPendingReview";');
        return { deleted };
    }
    const ids = await candidateIds(prisma);
    if (typeof args.archive === 'string') {
        const manifest = await writeArchive(prisma, args.archive, ids);
        log(`Wrote ${args.archive} (${(manifest.bytes / 1e6).toFixed(1)} MB) and ${args.archive}.json:`, manifest.counts);
        log('Keep a copy somewhere safe (Drive, or a private Supabase Storage bucket), then run --delete.');
        return { manifest };
    }
    const counts = { QuestionVersion: ids.QuestionVersion.length, QuestionPendingReview: ids.QuestionPendingReview.length };
    log('Would archive and delete (nothing written):', counts);
    return { counts };
}

if (require.main === module) {
    const prisma = require('../src/config/db');
    run(process.argv.slice(2), prisma)
        .catch((err) => { console.error(`\n${err.message}\n`); process.exitCode = 1; })
        .finally(() => prisma.closeDb());
}

module.exports = { run, parseArgs, candidateIds, writeArchive, readArchive, deleteArchived, KEEP, DAYS };
