-- When the learner last answered anything in this topic. Mastery decay runs
-- from it (engine/bkt.decayedMastery): BKT has no forgetting term, so a topic
-- mastered in month one stayed "Mastered" forever however long it went untouched.
-- Additive and nullable; backfilled by `npm run backfill:mastery`.
ALTER TABLE "UserTopicPerformance" ADD COLUMN "lastPracticedAt" TIMESTAMP(3);
