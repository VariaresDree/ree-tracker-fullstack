-- The Notebook: the mistake notebook's tags and personal notes. Additive only:
-- two new tables, no changes to existing ones, no backfill.
--
-- Mistakes themselves are derived from QuestionAttempt when read; MistakeTag
-- keeps only what the learner adds (the cause, and when they marked it fixed).
-- UserNote is one note per question or formula card. Both are display only:
-- they never feed θ, the forecast, readiness or the rankings.
-- CreateTable
CREATE TABLE "MistakeTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "cause" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MistakeTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MistakeTag_questionId_idx" ON "MistakeTag"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "MistakeTag_userId_questionId_key" ON "MistakeTag"("userId", "questionId");

-- CreateIndex
CREATE INDEX "UserNote_userId_updatedAt_idx" ON "UserNote"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserNote_userId_targetType_targetId_key" ON "UserNote"("userId", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "MistakeTag" ADD CONSTRAINT "MistakeTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeTag" ADD CONSTRAINT "MistakeTag_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNote" ADD CONSTRAINT "UserNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

