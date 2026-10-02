-- Forecast v2 (engine/forecast.js, model "v2-prc") models the PRC rule itself:
-- per-subject projected ratings, the projected general weighted average, the
-- conditional-pass probability and the subject that binds. Persisted alongside
-- the existing columns on POST /api/forecast/recompute. Additive and nullable;
-- v1 rows keep NULL and are treated as stale by the GET route.
ALTER TABLE "ForecastSnapshot" ADD COLUMN "subjectForecasts" JSONB;
