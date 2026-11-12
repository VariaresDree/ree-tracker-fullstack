-- The AI's unsure subtopic picks, kept for the admin to review (Admin ›
-- Question bank › Subtopics), and the background run's record of what it has
-- already asked.
CREATE TABLE "SubtopicSuggestion" (
    "questionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "subtopicId" TEXT,
    "guess" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubtopicSuggestion_pkey" PRIMARY KEY ("questionId")
);

CREATE INDEX "SubtopicSuggestion_resolvedAt_topicId_idx" ON "SubtopicSuggestion"("resolvedAt", "topicId");

ALTER TABLE "SubtopicSuggestion" ADD CONSTRAINT "SubtopicSuggestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase exposes public tables through its REST API; this one is server-only.
ALTER TABLE "SubtopicSuggestion" ENABLE ROW LEVEL SECURITY;
