-- One spelling for the subject. 584 questions said "Math"; every one already
-- links to a Mathematics topic, and every answer is stored as "Mathematics".
-- Reads merged the two spellings, so nothing a learner sees changes.
UPDATE "Question" SET "subject" = 'Mathematics' WHERE "subject" = 'Math';
UPDATE "QuestionPendingReview" SET "subject" = 'Mathematics' WHERE "subject" = 'Math';
