-- Sets to finish and personal links (the CELE tracker's "Progress check" and
-- "Useful links"): papers the learner means to get through, ticked off and
-- optionally pointing at the outside score they were logged as, and their
-- own resource links. Display only. Additive: two new tables. Ids are made on
-- the device, so there is no DEFAULT.

-- CreateTable
CREATE TABLE "PracticeSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "doneOn" TEXT,
    "outsideScoreId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topicId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeSet_userId_collection_idx" ON "PracticeSet"("userId", "collection");

-- CreateIndex
CREATE INDEX "UserLink_userId_idx" ON "UserLink"("userId");

-- AddForeignKey: deleting the account deletes its sets and links.
ALTER TABLE "PracticeSet" ADD CONSTRAINT "PracticeSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLink" ADD CONSTRAINT "UserLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-level security, as on every other table (20261019000000_rls_on_every_table):
-- no policies, so Supabase's REST roles see no rows. The API connects as the
-- tables' owner, which RLS doesn't restrict.
ALTER TABLE "PracticeSet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserLink" ENABLE ROW LEVEL SECURITY;
