-- An unsure subtopic pick saved as the question's tag, still to be checked by the
-- admin (services/subtopicAutoTag.js saveOpenPicks). Additive; no data changes here.
ALTER TABLE "SubtopicSuggestion" ADD COLUMN "savedAt" TIMESTAMP(3);
