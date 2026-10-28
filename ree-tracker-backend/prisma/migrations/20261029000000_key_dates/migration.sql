-- Key dates and rest days (the CELE tracker's "Important events" and the
-- REST / PRE-BOARDS / FINAL COACHING cells of its refresher calendar). The
-- learner's own calendar: preboards, coaching, deadlines, rest days. The study
-- plan works around them; nothing else reads them. Additive: one new table and
-- two User columns with defaults. The id is generated on the device (an entry
-- created and then edited or deleted offline must address the same row), so
-- there is no DEFAULT.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "restWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "reviewMode" TEXT NOT NULL DEFAULT 'self';

-- CreateTable
CREATE TABLE "KeyDate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsOn" TEXT NOT NULL,
    "endsOn" TEXT,
    "subject" TEXT,
    "topicIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeyDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KeyDate_userId_startsOn_idx" ON "KeyDate"("userId", "startsOn");

-- AddForeignKey: deleting the account deletes its key dates.
ALTER TABLE "KeyDate" ADD CONSTRAINT "KeyDate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-level security, as on every other table (20261019000000_rls_on_every_table):
-- no policies, so Supabase's REST roles see no rows. The API connects as the
-- table's owner, which RLS doesn't restrict.
ALTER TABLE "KeyDate" ENABLE ROW LEVEL SECURITY;
