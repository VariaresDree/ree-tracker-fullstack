-- Quiz files the admin shares with every learner.
CREATE TABLE "QuizFile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "subject" TEXT,
    "description" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "checksum" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuizFile_checksum_key" ON "QuizFile"("checksum");

-- CreateIndex
CREATE INDEX "QuizFile_uploadedBy_idx" ON "QuizFile"("uploadedBy");

-- AddForeignKey
ALTER TABLE "QuizFile" ADD CONSTRAINT "QuizFile_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Same as every other table: the app reaches this through its server only.
ALTER TABLE "QuizFile" ENABLE ROW LEVEL SECURITY;
