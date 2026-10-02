-- New users start from the population prior N(0, 1), the same PRIOR_SE the
-- estimator falls back to (engine/irt.js). The old 0.5 default was tighter than
-- any evidence justified, so a new learner's first answers barely moved theta.
-- Additive: changes the default for NEW rows only; existing rows are untouched.
ALTER TABLE "User" ALTER COLUMN "standardError" SET DEFAULT 1.0;
