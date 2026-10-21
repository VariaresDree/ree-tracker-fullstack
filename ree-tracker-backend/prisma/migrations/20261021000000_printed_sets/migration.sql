-- Printed paper sets (Exams > Paper sets) and their scanned answer sheets.
-- Additive: two new tables, no change to existing ones, no backfill.
--
-- PrintedSet: a mock exam drawn on the device, printed, and edited for that
-- printing only (never the question bank). Its id is made on the device (12
-- Crockford characters), so there is no DEFAULT. keyVersion is recomputed by
-- the API from the edited key.
--
-- ScannedSheet: one marked answer sheet of a set (a taker's, or the learner's
-- own self-check). Only the answers string and the name are stored, never a
-- photo. The id is a UUID from the device, so an offline replay lands once.
-- The score is the API's, redone whenever the set's key changes.
--
-- Display only: never read by theta, the forecast, readiness or the rankings.

-- CreateTable
CREATE TABLE "PrintedSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "keyVersion" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "plan" JSONB NOT NULL,
    "sections" JSONB NOT NULL,
    "items" JSONB NOT NULL,
    "edits" JSONB NOT NULL DEFAULT '{}',
    "prefs" JSONB NOT NULL,
    "warnings" JSONB,
    "sittingKey" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "printedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintedSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannedSheet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "takerName" TEXT,
    "isSelf" BOOLEAN NOT NULL DEFAULT false,
    "answers" TEXT NOT NULL,
    "keyVersion" TEXT NOT NULL,
    "correct" INTEGER NOT NULL,
    "scored" INTEGER NOT NULL,
    "sectionScores" JSONB NOT NULL,
    "generalAverage" DOUBLE PRECISION,
    "verdict" TEXT,
    "review" JSONB,
    "outsideScoreId" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScannedSheet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrintedSet_userId_createdAt_idx" ON "PrintedSet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ScannedSheet_userId_setId_scannedAt_idx" ON "ScannedSheet"("userId", "setId", "scannedAt");

-- CreateIndex: the foreign key's own index, so deleting a set finds its sheets.
CREATE INDEX "ScannedSheet_setId_idx" ON "ScannedSheet"("setId");

-- AddForeignKey: deleting the account deletes its sets.
ALTER TABLE "PrintedSet" ADD CONSTRAINT "PrintedSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: deleting a set deletes its sheets.
ALTER TABLE "ScannedSheet" ADD CONSTRAINT "ScannedSheet_setId_fkey" FOREIGN KEY ("setId") REFERENCES "PrintedSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: deleting the account deletes its sheets.
ALTER TABLE "ScannedSheet" ADD CONSTRAINT "ScannedSheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-level security, as on every other table (20261019000000_rls_on_every_table;
-- tests/integration/rls.dbtest.js): no policies, so Supabase's REST roles see
-- no rows even if a grant is ever added by mistake. The API connects as the
-- tables' owner, which RLS doesn't restrict.
ALTER TABLE "PrintedSet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScannedSheet" ENABLE ROW LEVEL SECURITY;
