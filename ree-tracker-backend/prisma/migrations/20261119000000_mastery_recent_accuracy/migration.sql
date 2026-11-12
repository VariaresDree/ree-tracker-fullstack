-- Topic mastery from recent accuracy (engine/bkt.js masterySequence), replacing
-- the classic BKT fold that drifted to exactly 1.0 for any topic answered right
-- more than about 57% of the time (57 of 184 rows on 2026-11-12). Every topic
-- row is recomputed from the learner's answers, in answer order, ties by id:
--   accuracy = the average with a prior of 4 answers at 41.25% while there are
--              at most 16 answers, then each later answer moves it 5% of the way;
--   mastery  = (accuracy - 0.25) / 0.65, kept within [0, 1].
-- The same arithmetic as services/masteryRollups.foldUserMastery, held equal by
-- tests/integration/masteryRecentAccuracy.dbtest.js. Data only, no schema
-- change; a row with no answers left is not touched.
WITH ordered AS (
    SELECT qa."userId",
           COALESCE(NULLIF(t."name", ''), NULLIF(qa."subtopic", ''), 'General') AS topic,
           CASE WHEN qa."isCorrect" THEN 1.0 ELSE 0.0 END AS x,
           ROW_NUMBER() OVER (
               PARTITION BY qa."userId", COALESCE(NULLIF(t."name", ''), NULLIF(qa."subtopic", ''), 'General')
               ORDER BY COALESCE(qa."answeredAt", qa."createdAt"), qa."id" COLLATE "C"
           ) AS i,
           COUNT(*) OVER (
               PARTITION BY qa."userId", COALESCE(NULLIF(t."name", ''), NULLIF(qa."subtopic", ''), 'General')
           ) AS n
    FROM "QuestionAttempt" qa
    LEFT JOIN "Question" q ON q."id" = qa."questionId"
    LEFT JOIN "Topic" t ON t."id" = q."topicId"
),
folded AS (
    SELECT "userId", topic, n,
           CASE WHEN n <= 16
                THEN (4 * 0.4125 + SUM(x)) / (4 + n)
                ELSE power(0.95, n - 16) * (4 * 0.4125 + COALESCE(SUM(x) FILTER (WHERE i <= 16), 0)) / 20
                     + COALESCE(SUM(0.05 * power(0.95, n - i) * x) FILTER (WHERE i > 16), 0)
           END AS acc
    FROM ordered
    GROUP BY "userId", topic, n
)
UPDATE "UserTopicPerformance" u
SET "pMastery" = LEAST(1.0, GREATEST(0.0, (f.acc - 0.25) / 0.65))::double precision,
    "masteryN" = f.n::int
FROM folded f
WHERE u."userId" = f."userId" AND u."topic" = f.topic;
