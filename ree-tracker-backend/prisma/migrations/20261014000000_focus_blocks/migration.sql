-- Focus time: the Pomodoro's focus blocks. Additive only: one new table, no
-- changes to existing ones, no backfill.
--
-- One row per finished focus block (or one stopped early after at least five
-- minutes), with the subject it was for. clientId, the device's id for the
-- block, makes a replayed write land once. Display only.
-- CreateTable
CREATE TABLE "FocusBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FocusBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FocusBlock_userId_endedAt_idx" ON "FocusBlock"("userId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FocusBlock_userId_clientId_key" ON "FocusBlock"("userId", "clientId");

-- AddForeignKey
ALTER TABLE "FocusBlock" ADD CONSTRAINT "FocusBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

