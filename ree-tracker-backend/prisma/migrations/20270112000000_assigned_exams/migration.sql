-- Exams the admin puts together from the question bank for every learner.
CREATE TABLE "AssignedExam" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "questionIds" TEXT[],
    "timeLimitSecs" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignedExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssignedExam_status_publishedAt_idx" ON "AssignedExam"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "AssignedExam_createdBy_idx" ON "AssignedExam"("createdBy");

-- AddForeignKey
ALTER TABLE "AssignedExam" ADD CONSTRAINT "AssignedExam_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Same as every other table: the app reaches this through its server only.
ALTER TABLE "AssignedExam" ENABLE ROW LEVEL SECURITY;
