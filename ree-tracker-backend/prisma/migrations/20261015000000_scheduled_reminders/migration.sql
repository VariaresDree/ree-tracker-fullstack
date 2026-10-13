-- Scheduled reminders. Additive only: two nullable columns on User, no
-- backfill. reminderHour is the Manila hour the learner chose (NULL = off);
-- reminderLastSentOn is the Manila day it last went out, so it goes once a day.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "reminderHour" INTEGER,
ADD COLUMN     "reminderLastSentOn" TEXT;

