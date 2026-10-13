-- Rematch: a battle can point at the battle it is a rematch of. Additive only:
-- one nullable column, its unique index and a self-reference, no backfill.
--
-- Unique, so a finished battle has at most one rematch: when two players press
-- Rematch at once, the second insert fails on the index and reads back the
-- first, and both land in the same lobby. Deleting the original battle leaves
-- its rematch standing (SET NULL).
-- Generated with `prisma migrate diff`.
-- AlterTable
ALTER TABLE "Battle" ADD COLUMN     "rematchOfId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Battle_rematchOfId_key" ON "Battle"("rematchOfId");

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_rematchOfId_fkey" FOREIGN KEY ("rematchOfId") REFERENCES "Battle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
