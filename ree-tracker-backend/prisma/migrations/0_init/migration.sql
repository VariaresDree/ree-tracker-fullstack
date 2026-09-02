-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "photoURL" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "globalStreak" INTEGER NOT NULL DEFAULT 0,
    "thetaRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "standardError" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activityCalendar" JSONB,
    "thetaHistory" JSONB,
    "matrix" JSONB,
    "microTopics" JSONB,
    "blindSpots" TEXT[],
    "examDate" TEXT,
    "dailyTarget" INTEGER DEFAULT 50,
    "eloRating" INTEGER NOT NULL DEFAULT 1200,
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "gauntletLevel" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normKey" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "curated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "subtopic" TEXT NOT NULL,
    "topicId" TEXT,
    "text" TEXT NOT NULL,
    "options" TEXT[],
    "answer" TEXT NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "fixedExplanation" TEXT,
    "source" TEXT DEFAULT 'legacy',
    "type" TEXT DEFAULT 'conceptual',
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloomLevel" TEXT DEFAULT 'REMEMBER',
    "difficultyTier" INTEGER DEFAULT 1,
    "competencyArea" TEXT,
    "explanationStatus" TEXT DEFAULT 'PENDING',
    "irtA" DOUBLE PRECISION,
    "irtB" DOUBLE PRECISION,
    "irtC" DOUBLE PRECISION DEFAULT 0.20,
    "calibrationN" INTEGER NOT NULL DEFAULT 0,
    "lastCalibratedAt" TIMESTAMP(3),
    "empiricalA" DOUBLE PRECISION,
    "empiricalB" DOUBLE PRECISION,
    "empiricalN" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionPendingReview" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "subtopic" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT[],
    "answer" TEXT NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "fixedExplanation" TEXT,
    "source" TEXT DEFAULT 'ai',
    "type" TEXT DEFAULT 'conceptual',
    "bloomLevel" TEXT DEFAULT 'REMEMBER',
    "difficultyTier" INTEGER DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "submittedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "promotedQuestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionPendingReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionVersion" (
    "id" TEXT NOT NULL,
    "questionId" TEXT,
    "reviewId" TEXT,
    "action" TEXT NOT NULL,
    "editor" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "targetSubject" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "timeTakenSecs" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "config" JSONB,

    CONSTRAINT "ExamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionAttempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "subtopic" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "confidenceLevel" TEXT NOT NULL DEFAULT 'LOW',
    "timeSpentMs" INTEGER NOT NULL DEFAULT 0,
    "clientAttemptId" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'LEGACY',
    "offline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "QuestionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storagePath" TEXT,
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL DEFAULT 'global_config',
    "tos" JSONB,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "rank" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "thetaRating" DOUBLE PRECISION NOT NULL,
    "eloRating" INTEGER NOT NULL DEFAULT 1200,
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "globalStreak" INTEGER NOT NULL DEFAULT 0,
    "activeDays" INTEGER NOT NULL DEFAULT 0,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastActive" TIMESTAMP(3) NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("rank")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "questions" JSONB NOT NULL,
    "timeLimitSecs" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "startedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleOutcome" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "timeTakenSecs" INTEGER NOT NULL,
    "placement" INTEGER NOT NULL,
    "eloBefore" INTEGER NOT NULL,
    "eloAfter" INTEGER NOT NULL,
    "eloDelta" INTEGER NOT NULL,
    "tierBefore" TEXT NOT NULL,
    "tierAfter" TEXT NOT NULL,
    "perQuestion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTopicPerformance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "topicId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "totalTime" INTEGER NOT NULL DEFAULT 0,
    "pMastery" DOUBLE PRECISION,
    "masteryN" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTopicPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThetaHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theta" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThetaHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SRSCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewDate" TIMESTAMP(3) NOT NULL,
    "lastReviewed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SRSCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "subtopic" TEXT,
    "totalQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "durationSecs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "dueDate" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAbility" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "theta" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "se" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAbility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passProbability" DOUBLE PRECISION NOT NULL,
    "topnotcherProbability" DOUBLE PRECISION NOT NULL,
    "expectedRank" INTEGER,
    "weakTopics" JSONB,
    "recommendedActions" JSONB,
    "modelVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineeringConstant" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "keyword" TEXT,
    "subject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngineeringConstant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineeringFormula" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eq" TEXT NOT NULL,
    "subtopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngineeringFormula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceSource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT,
    "edition" TEXT,
    "section" TEXT,
    "url" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceCard" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "symbol" TEXT,
    "name" TEXT NOT NULL,
    "formulaLatex" TEXT,
    "valueUnit" TEXT,
    "description" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "purposeExamTip" TEXT,
    "subject" TEXT NOT NULL,
    "topicId" TEXT,
    "subtopicTag" TEXT,
    "dimensionless" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sourceId" TEXT,
    "submittedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceCardVersion" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "editor" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceCardVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadinessSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "topicCoverage" DOUBLE PRECISION NOT NULL,
    "accuracyRate" DOUBLE PRECISION NOT NULL,
    "theta" DOUBLE PRECISION NOT NULL,
    "consistency" DOUBLE PRECISION NOT NULL,
    "blindSpotRatio" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadinessSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusWeight" (
    "subject" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyllabusWeight_pkey" PRIMARY KEY ("subject")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_FLIGHT',
    "httpStatus" INTEGER,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "QuestionFlag" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_thetaRating_idx" ON "User"("thetaRating");

-- CreateIndex
CREATE INDEX "User_lastActive_idx" ON "User"("lastActive");

-- CreateIndex
CREATE INDEX "User_eloRating_idx" ON "User"("eloRating");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE INDEX "Topic_subject_active_sortOrder_idx" ON "Topic"("subject", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_subject_normKey_key" ON "Topic"("subject", "normKey");

-- CreateIndex
CREATE INDEX "Question_subject_irtB_idx" ON "Question"("subject", "irtB");

-- CreateIndex
CREATE INDEX "Question_isFlagged_subtopic_idx" ON "Question"("isFlagged", "subtopic");

-- CreateIndex
CREATE INDEX "Question_topicId_idx" ON "Question"("topicId");

-- CreateIndex
CREATE INDEX "QuestionPendingReview_status_createdAt_idx" ON "QuestionPendingReview"("status", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionVersion_questionId_createdAt_idx" ON "QuestionVersion"("questionId", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionVersion_reviewId_createdAt_idx" ON "QuestionVersion"("reviewId", "createdAt");

-- CreateIndex
CREATE INDEX "ExamSession_userId_createdAt_idx" ON "ExamSession"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSession_id_userId_key" ON "ExamSession"("id", "userId");

-- CreateIndex
CREATE INDEX "QuestionAttempt_userId_createdAt_idx" ON "QuestionAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionAttempt_userId_subject_idx" ON "QuestionAttempt"("userId", "subject");

-- CreateIndex
CREATE INDEX "QuestionAttempt_userId_mode_createdAt_idx" ON "QuestionAttempt"("userId", "mode", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionAttempt_userId_subtopic_idx" ON "QuestionAttempt"("userId", "subtopic");

-- CreateIndex
CREATE INDEX "QuestionAttempt_userId_confidenceLevel_isCorrect_idx" ON "QuestionAttempt"("userId", "confidenceLevel", "isCorrect");

-- CreateIndex
CREATE INDEX "QuestionAttempt_userId_answeredAt_idx" ON "QuestionAttempt"("userId", "answeredAt");

-- CreateIndex
CREATE INDEX "QuestionAttempt_questionId_idx" ON "QuestionAttempt"("questionId");

-- CreateIndex
CREATE INDEX "QuestionAttempt_sessionId_idx" ON "QuestionAttempt"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAttempt_userId_clientAttemptId_key" ON "QuestionAttempt"("userId", "clientAttemptId");

-- CreateIndex
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");

-- CreateIndex
CREATE INDEX "Material_folderId_idx" ON "Material"("folderId");

-- CreateIndex
CREATE INDEX "Bookmark_questionId_idx" ON "Bookmark"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_questionId_key" ON "Bookmark"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_userId_key" ON "LeaderboardEntry"("userId");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_snapshotAt_idx" ON "LeaderboardEntry"("snapshotAt");

-- CreateIndex
CREATE INDEX "Battle_status_idx" ON "Battle"("status");

-- CreateIndex
CREATE INDEX "BattleOutcome_userId_createdAt_idx" ON "BattleOutcome"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BattleOutcome_battleId_userId_key" ON "BattleOutcome"("battleId", "userId");

-- CreateIndex
CREATE INDEX "UserTopicPerformance_userId_subject_idx" ON "UserTopicPerformance"("userId", "subject");

-- CreateIndex
CREATE INDEX "UserTopicPerformance_topicId_idx" ON "UserTopicPerformance"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTopicPerformance_userId_topic_key" ON "UserTopicPerformance"("userId", "topic");

-- CreateIndex
CREATE INDEX "ThetaHistory_userId_recordedAt_idx" ON "ThetaHistory"("userId", "recordedAt");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_date_idx" ON "ActivityLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLog_userId_date_key" ON "ActivityLog"("userId", "date");

-- CreateIndex
CREATE INDEX "SRSCard_userId_nextReviewDate_idx" ON "SRSCard"("userId", "nextReviewDate");

-- CreateIndex
CREATE INDEX "SRSCard_questionId_idx" ON "SRSCard"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "SRSCard_userId_questionId_key" ON "SRSCard"("userId", "questionId");

-- CreateIndex
CREATE INDEX "StudySession_userId_createdAt_idx" ON "StudySession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PlannerTask_userId_completed_idx" ON "PlannerTask"("userId", "completed");

-- CreateIndex
CREATE INDEX "UserAbility_userId_idx" ON "UserAbility"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAbility_userId_subject_key" ON "UserAbility"("userId", "subject");

-- CreateIndex
CREATE INDEX "ForecastSnapshot_userId_createdAt_idx" ON "ForecastSnapshot"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EngineeringConstant_category_idx" ON "EngineeringConstant"("category");

-- CreateIndex
CREATE UNIQUE INDEX "EngineeringConstant_category_name_key" ON "EngineeringConstant"("category", "name");

-- CreateIndex
CREATE INDEX "EngineeringFormula_subject_idx" ON "EngineeringFormula"("subject");

-- CreateIndex
CREATE UNIQUE INDEX "EngineeringFormula_subject_title_key" ON "EngineeringFormula"("subject", "title");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceSource_title_edition_key" ON "ReferenceSource"("title", "edition");

-- CreateIndex
CREATE INDEX "ReferenceCard_status_subject_idx" ON "ReferenceCard"("status", "subject");

-- CreateIndex
CREATE INDEX "ReferenceCard_topicId_idx" ON "ReferenceCard"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceCard_kind_subject_name_key" ON "ReferenceCard"("kind", "subject", "name");

-- CreateIndex
CREATE INDEX "ReferenceCardVersion_cardId_createdAt_idx" ON "ReferenceCardVersion"("cardId", "createdAt");

-- CreateIndex
CREATE INDEX "ReadinessSnapshot_userId_createdAt_idx" ON "ReadinessSnapshot"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_createdAt_idx" ON "IdempotencyRecord"("createdAt");

-- CreateIndex
CREATE INDEX "QuestionFlag_questionId_idx" ON "QuestionFlag"("questionId");

-- CreateIndex
CREATE INDEX "QuestionFlag_userId_createdAt_idx" ON "QuestionFlag"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionFlag_questionId_userId_key" ON "QuestionFlag"("questionId", "userId");

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleOutcome" ADD CONSTRAINT "BattleOutcome_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleOutcome" ADD CONSTRAINT "BattleOutcome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopicPerformance" ADD CONSTRAINT "UserTopicPerformance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopicPerformance" ADD CONSTRAINT "UserTopicPerformance_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThetaHistory" ADD CONSTRAINT "ThetaHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SRSCard" ADD CONSTRAINT "SRSCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SRSCard" ADD CONSTRAINT "SRSCard_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerTask" ADD CONSTRAINT "PlannerTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAbility" ADD CONSTRAINT "UserAbility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastSnapshot" ADD CONSTRAINT "ForecastSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceCard" ADD CONSTRAINT "ReferenceCard_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceCard" ADD CONSTRAINT "ReferenceCard_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ReferenceSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadinessSnapshot" ADD CONSTRAINT "ReadinessSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionFlag" ADD CONSTRAINT "QuestionFlag_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

