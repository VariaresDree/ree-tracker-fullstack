-- Syllabus checklist (Progress > Syllabus): per user and TOS topic, the Read /
-- Watched / Drilled ticks, start and finish dates and a note. Display only:
-- never read by theta, the forecast, readiness or the rankings. Additive: one
-- new table, no change to existing ones. Topics are renamed in place and
-- deactivated rather than deleted, so the topic link is stable.

-- CreateTable
CREATE TABLE "SyllabusProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "drilled" BOOLEAN NOT NULL DEFAULT false,
    "startedOn" TEXT,
    "finishedOn" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyllabusProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyllabusProgress_topicId_idx" ON "SyllabusProgress"("topicId");

-- CreateIndex: one row per learner and topic (the PUT upserts on it).
CREATE UNIQUE INDEX "SyllabusProgress_userId_topicId_key" ON "SyllabusProgress"("userId", "topicId");

-- AddForeignKey: deleting the account deletes its checklist.
ALTER TABLE "SyllabusProgress" ADD CONSTRAINT "SyllabusProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusProgress" ADD CONSTRAINT "SyllabusProgress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
