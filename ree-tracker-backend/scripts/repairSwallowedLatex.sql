-- One-off repair (2026-11): LaTeX that JSON parsing swallowed before
-- parseModelJson was fixed. "\frac" was stored as a form feed + "rac", "\times"
-- as a tab + "imes", and so on. Same rules as repairSwallowedLatex (@ree/shared).
-- Each changed question gets a QuestionVersion row holding what it was before.
-- QuestionAttempt.selectedAnswer stores option text, so it is repaired the same
-- way, keeping past reviews matched to their options. isCorrect doesn't change.
--
-- Run the whole file in one go; it is one transaction.
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.fix_latex(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(t,
    E'\\f', E'\\\\f', 'g'),
    E'\\x08', E'\\\\b', 'g'),
    E'\\t(?=[a-zA-Z])', E'\\\\t', 'g'),
    E'\\r(?=[a-zA-Z])', E'\\\\r', 'g'),
    E'\\n(?=(?:eq|u|abla|ot)(?![a-zA-Z]))', E'\\\\n', 'g')
$fn$;

CREATE TEMP TABLE repair_rows ON COMMIT DROP AS
SELECT q.id, q.text, q.options, q.answer, q."fixedExplanation",
       pg_temp.fix_latex(q.text) AS new_text,
       ARRAY(SELECT pg_temp.fix_latex(o) FROM unnest(q.options) WITH ORDINALITY u(o, n) ORDER BY n) AS new_options,
       pg_temp.fix_latex(q.answer) AS new_answer,
       pg_temp.fix_latex(q."fixedExplanation") AS new_explanation
FROM "Question" q;

DELETE FROM repair_rows
WHERE new_text = text AND new_options = options AND new_answer = answer
  AND new_explanation IS NOT DISTINCT FROM "fixedExplanation";

INSERT INTO "QuestionVersion" (id, "questionId", action, editor, snapshot, "createdAt")
SELECT gen_random_uuid()::text, r.id, 'LIVE_EDIT', 'repair-swallowed-latex',
       jsonb_build_object('text', r.text, 'options', to_jsonb(r.options), 'answer', r.answer, 'fixedExplanation', r."fixedExplanation"),
       now()
FROM repair_rows r;

UPDATE "QuestionAttempt" a
SET "selectedAnswer" = pg_temp.fix_latex(a."selectedAnswer")
FROM repair_rows r
WHERE a."questionId" = r.id AND a."selectedAnswer" IS NOT NULL
  AND a."selectedAnswer" <> pg_temp.fix_latex(a."selectedAnswer");

UPDATE "Question" q
SET text = r.new_text, options = r.new_options, answer = r.new_answer, "fixedExplanation" = r.new_explanation
FROM repair_rows r
WHERE q.id = r.id;

SELECT count(*) AS repaired FROM repair_rows;

COMMIT;
