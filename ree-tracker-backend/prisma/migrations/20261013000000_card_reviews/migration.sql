-- Spaced repetition for formula cards. Additive only: one new table, no
-- changes to existing ones, no backfill.
--
-- A learner rates a formula card after flipping it; SM-2 schedules the next
-- review. One row per learner and card; lastReviewId makes a replayed rating
-- a no-op. Question reviews stay in SRSCard, scheduled from telemetry.
-- CreateTable
CREATE TABLE "CardReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewDate" TIMESTAMP(3) NOT NULL,
    "lastReviewed" TIMESTAMP(3) NOT NULL,
    "lastReviewId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardReview_userId_nextReviewDate_idx" ON "CardReview"("userId", "nextReviewDate");

-- CreateIndex
CREATE INDEX "CardReview_cardId_idx" ON "CardReview"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "CardReview_userId_cardId_key" ON "CardReview"("userId", "cardId");

-- AddForeignKey
ALTER TABLE "CardReview" ADD CONSTRAINT "CardReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardReview" ADD CONSTRAINT "CardReview_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "ReferenceCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

