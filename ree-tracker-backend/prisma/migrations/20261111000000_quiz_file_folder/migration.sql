-- A shared quiz file can sit in a handouts folder. Deleting the folder moves the
-- quiz to the top level rather than deleting it: the bytes live in this row.
ALTER TABLE "QuizFile" ADD COLUMN "folderId" TEXT;

-- CreateIndex
CREATE INDEX "QuizFile_folderId_idx" ON "QuizFile"("folderId");

-- AddForeignKey
ALTER TABLE "QuizFile" ADD CONSTRAINT "QuizFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
