-- A question's subtopic inside its topic (Admin › Question bank › Tag
-- subtopics). Nullable: every question starts untagged. A subtopic's removal
-- untags its questions rather than deleting them.
ALTER TABLE "Question" ADD COLUMN "subtopicId" TEXT;

CREATE INDEX "Question_subtopicId_idx" ON "Question"("subtopicId");

ALTER TABLE "Question" ADD CONSTRAINT "Question_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "SyllabusSubtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
