-- The learner's own rating of a syllabus topic (the CELE tracker's "Meta
-- topics"): how sure they are and how much they dread it, and an admin-set
-- high-yield flag on the topic. Additive: nullable columns, and a boolean
-- defaulting to false.

-- AlterTable
ALTER TABLE "SyllabusProgress" ADD COLUMN "confidence" INTEGER,
ADD COLUMN "dread" INTEGER;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN "highYield" BOOLEAN NOT NULL DEFAULT false;
