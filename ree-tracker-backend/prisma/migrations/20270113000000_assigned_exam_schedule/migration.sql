-- When learners may start an assigned exam, and the admin's lock on it.
-- AlterTable
ALTER TABLE "AssignedExam" ADD COLUMN     "closesAt" TIMESTAMP(3),
ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "opensAt" TIMESTAMP(3);
