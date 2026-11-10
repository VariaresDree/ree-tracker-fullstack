import { describe, it, expect, afterAll, beforeEach } from 'vitest';

// The table against a real Postgres: bytes round-trip, a list leaves them out,
// the checksum is unique, deleting the uploader keeps the file, and deleting its
// folder moves it to the top level.

const prisma = require('../../src/config/db');
const { LIST_SELECT, checksumOf } = require('../../src/services/quizFiles');

const UPLOADER = 'quiz-file-admin';
const BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0xff, 0x10, 0x80]);
const row = (over = {}) => ({
    name: 'AC', fileName: 'ac.quiz', sizeBytes: BYTES.length, questionCount: 3, bytes: BYTES, checksum: checksumOf(BYTES), ...over,
});

beforeEach(async () => {
    await prisma.quizFile.deleteMany({});
    await prisma.folder.deleteMany({ where: { name: { startsWith: 'quiz-folder-test' } } });
    await prisma.user.deleteMany({ where: { id: UPLOADER } });
    await prisma.user.create({ data: { id: UPLOADER, email: `${UPLOADER}@example.com` } });
});

afterAll(async () => {
    await prisma.quizFile.deleteMany({});
    await prisma.folder.deleteMany({ where: { name: { startsWith: 'quiz-folder-test' } } });
    await prisma.user.deleteMany({ where: { id: UPLOADER } });
    await prisma.$disconnect();
});

describe('QuizFile', () => {
    it('gives back exactly the bytes it was given', async () => {
        const { id } = await prisma.quizFile.create({ data: row() });
        const { bytes } = await prisma.quizFile.findUnique({ where: { id }, select: { bytes: true } });
        expect(Buffer.compare(Buffer.from(bytes), BYTES)).toBe(0);
    });

    it('a list leaves the bytes out', async () => {
        await prisma.quizFile.create({ data: row() });
        const [item] = await prisma.quizFile.findMany({ select: LIST_SELECT });
        expect(item.bytes).toBeUndefined();
        expect(item.checksum).toHaveLength(64);
    });

    it('won’t hold the same file twice', async () => {
        await prisma.quizFile.create({ data: row() });
        await expect(prisma.quizFile.create({ data: row({ name: 'Again' }) })).rejects.toMatchObject({ code: 'P2002' });
    });

    it('deleting its folder, or a folder above it, moves it to the top level', async () => {
        const top = await prisma.folder.create({ data: { name: 'quiz-folder-test top' } });
        const inner = await prisma.folder.create({ data: { name: 'quiz-folder-test inner', parentId: top.id } });
        const a = await prisma.quizFile.create({ data: row({ folderId: top.id }) });
        const other = Buffer.concat([BYTES, Buffer.from([1])]);
        const b = await prisma.quizFile.create({ data: row({ name: 'B', bytes: other, checksum: checksumOf(other), folderId: inner.id }) });
        await prisma.folder.delete({ where: { id: top.id } });
        const after = await prisma.quizFile.findMany({ where: { id: { in: [a.id, b.id] } }, select: { folderId: true } });
        expect(after).toEqual([{ folderId: null }, { folderId: null }]);
    });

    it('won’t point at a folder that isn’t there', async () => {
        await expect(prisma.quizFile.create({ data: row({ folderId: 'no-such-folder' }) })).rejects.toMatchObject({ code: 'P2003' });
    });

    it('keeps the file when its uploader’s account goes', async () => {
        const { id } = await prisma.quizFile.create({ data: row({ uploadedBy: UPLOADER }) });
        await prisma.user.delete({ where: { id: UPLOADER } });
        const after = await prisma.quizFile.findUnique({ where: { id }, select: { uploadedBy: true } });
        expect(after).toEqual({ uploadedBy: null });
    });
});
