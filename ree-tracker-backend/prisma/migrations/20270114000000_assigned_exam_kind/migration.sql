-- What kind of set an assigned exam is: 'exam' | 'quiz' | 'problem-set' | 'practice-set'.
-- AlterTable
ALTER TABLE "AssignedExam" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'exam';
