-- The latest rating of each formula card the learner has rated, so the cards
-- last rated Again or Hard can be printed as a weak-formula sheet (the CELE
-- tracker's tip: put only the formulas you still miss on the wall).
-- Additive: one nullable column; rows rated before it stay null.

-- AlterTable
ALTER TABLE "CardReview" ADD COLUMN "lastRating" TEXT;
