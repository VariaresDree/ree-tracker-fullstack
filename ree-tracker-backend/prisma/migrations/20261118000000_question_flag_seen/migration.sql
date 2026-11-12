-- When the learner saw an answered report (Account › Your reports); until then
-- Today mentions it. Reports already answered start unseen.
ALTER TABLE "QuestionFlag" ADD COLUMN "seenAt" TIMESTAMP(3);
