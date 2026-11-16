-- Signs that a live question's key may be wrong, for Admin › Question bank ›
-- Fix › Questions to check (services/keyCheck.js). Additive.
CREATE TABLE "QuestionCheck" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" JSONB,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "resolvedBy" TEXT,

    CONSTRAINT "QuestionCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuestionCheck_questionId_reason_key" ON "QuestionCheck"("questionId", "reason");
CREATE INDEX "QuestionCheck_resolvedAt_idx" ON "QuestionCheck"("resolvedAt");

ALTER TABLE "QuestionCheck" ADD CONSTRAINT "QuestionCheck_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase exposes public tables through its REST API; this one is server-only.
ALTER TABLE "QuestionCheck" ENABLE ROW LEVEL SECURITY;
