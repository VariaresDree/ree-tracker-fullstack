-- How a learner picks a mock's questions, and their own counts. Null is an even spread.
ALTER TABLE "User" ADD COLUMN "drawPrefs" JSONB;
