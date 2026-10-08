-- Outside scores (Exams > Past sittings): results the learner records from
-- outside the app, retests included. Display only: never read by theta, the
-- forecast, readiness or the rankings. Additive: one new table, no change to
-- existing ones. The id is generated on the device (offline create, then edit
-- or delete, must address the same row), so there is no DEFAULT.

-- CreateTable
CREATE TABLE "OutsideScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT,
    "takenOn" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "total" INTEGER NOT NULL,
    "note" TEXT,
    "retestOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutsideScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutsideScore_userId_takenOn_idx" ON "OutsideScore"("userId", "takenOn");

-- CreateIndex
CREATE INDEX "OutsideScore_retestOfId_idx" ON "OutsideScore"("retestOfId");

-- AddForeignKey: deleting a first try keeps its retests as ordinary entries.
ALTER TABLE "OutsideScore" ADD CONSTRAINT "OutsideScore_retestOfId_fkey" FOREIGN KEY ("retestOfId") REFERENCES "OutsideScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: deleting the account deletes its outside scores.
ALTER TABLE "OutsideScore" ADD CONSTRAINT "OutsideScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
