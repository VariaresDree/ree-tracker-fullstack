-- Formula cards under the syllabus subtopics, and rewrites of live cards that
-- wait for an admin (Library round, 2026-11-16). Additive.
ALTER TABLE "ReferenceCard" ADD COLUMN "subtopicId" TEXT;
CREATE INDEX "ReferenceCard_subtopicId_idx" ON "ReferenceCard"("subtopicId");
ALTER TABLE "ReferenceCard" ADD CONSTRAINT "ReferenceCard_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "SyllabusSubtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ReferenceCardRevision" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "retire" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ReferenceCardRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReferenceCardRevision_status_createdAt_idx" ON "ReferenceCardRevision"("status", "createdAt");
CREATE INDEX "ReferenceCardRevision_cardId_idx" ON "ReferenceCardRevision"("cardId");
ALTER TABLE "ReferenceCardRevision" ADD CONSTRAINT "ReferenceCardRevision_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "ReferenceCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase exposes public tables through its REST API; this one is server-only.
ALTER TABLE "ReferenceCardRevision" ENABLE ROW LEVEL SECURITY;
