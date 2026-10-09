-- Sitting review and a server-side Gauntlet ladder. Additive only: two nullable
-- columns on QuestionAttempt and three on User; no table rewrites, no backfill.

-- The option the learner picked ('' = left blank; NULL = not recorded, which
-- is every row written before this column existed) and the item's position in
-- its sitting. Attempts kept only isCorrect, so a past mock could never show
-- "your answer" or list its items in the order they were asked.
ALTER TABLE "QuestionAttempt" ADD COLUMN "selectedAnswer" TEXT;
ALTER TABLE "QuestionAttempt" ADD COLUMN "itemIndex" INTEGER;

-- The Gauntlet ladder lived only in each device's local stats: User.gauntletLevel
-- existed and was never written. The server now keeps the level (existing
-- column), the 12-hour lock, the subject boards cleared, and when it last wrote
-- them (NULL = never; the first run adopts the device's level once).
ALTER TABLE "User" ADD COLUMN "gauntletLockUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "gauntletBoardClears" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "gauntletUpdatedAt" TIMESTAMP(3);
