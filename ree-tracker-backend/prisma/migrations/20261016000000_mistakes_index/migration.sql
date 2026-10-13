-- The mistake notebook's read: a learner's newest wrong attempts
-- (GET /api/user/mistakes). Additive only: one index, no data change.
-- Generated with `prisma migrate diff`.
-- CreateIndex
CREATE INDEX "QuestionAttempt_userId_isCorrect_createdAt_idx" ON "QuestionAttempt"("userId", "isCorrect", "createdAt");
