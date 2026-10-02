-- Planner v2 (engine/plan.js): a planned task names what it is (drill / review /
-- mock), the topic and subject it targets, and how many questions complete it,
-- so it can be launched and can complete itself from the day's answers. Free-
-- text tasks keep these NULL. Additive and nullable.
ALTER TABLE "PlannerTask" ADD COLUMN "kind" TEXT,
ADD COLUMN "subject" TEXT,
ADD COLUMN "topic" TEXT,
ADD COLUMN "topicId" TEXT,
ADD COLUMN "targetCount" INTEGER;
