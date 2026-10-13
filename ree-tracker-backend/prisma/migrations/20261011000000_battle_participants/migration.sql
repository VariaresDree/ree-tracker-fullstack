-- Battle participants and their live answers. Additive only: one new table, no
-- changes to existing ones, no backfill.
--
-- Players and the answers the server had received from them lived only in the
-- socket server's memory. A restart (Render's free plan sleeps), the idle-lobby
-- clean-up after everyone disconnected, or one player closing the app mid-battle
-- left nothing for the deadline to score: the battle stayed IN_PROGRESS for good,
-- the other player's review never opened, and the player who left could not come
-- back. Each player's row now holds their answers as they arrive (no correctness:
-- they are regraded against the battle's key when read), and when they finished.
-- CreateTable
CREATE TABLE "BattleParticipant" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "finishedAt" TIMESTAMP(3),
    "score" INTEGER,
    "timeTakenSecs" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BattleParticipant_userId_idx" ON "BattleParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleParticipant_battleId_userId_key" ON "BattleParticipant"("battleId", "userId");

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

