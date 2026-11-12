-- A learner's report can be closed by an admin (Admin › Question bank ›
-- Reports) and stays on record. Every existing report starts open.
ALTER TABLE "QuestionFlag" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "QuestionFlag" ADD COLUMN "resolution" TEXT;
ALTER TABLE "QuestionFlag" ADD COLUMN "resolvedBy" TEXT;

CREATE INDEX "QuestionFlag_resolvedAt_idx" ON "QuestionFlag"("resolvedAt");
