-- Outside scores become an assessment log (the CELE tracker's "Assessments"
-- sheet): per-subject scores for an all-three entry, the time used, how many
-- items were guessed or skipped, and the topics to improve. Additive: new
-- nullable columns and one array defaulting to empty, so existing rows and an
-- older app that never sends them are unchanged. Still display only, except
-- that the study planner may raise a flagged topic's priority.

-- AlterTable
ALTER TABLE "OutsideScore" ADD COLUMN "parts" JSONB,
ADD COLUMN "minutesUsed" INTEGER,
ADD COLUMN "guessed" INTEGER,
ADD COLUMN "skipped" INTEGER,
ADD COLUMN "improveTopicIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
