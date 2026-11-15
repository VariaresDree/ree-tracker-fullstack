-- Players the host removed from a battle's lobby: kept out when they rejoin
-- with the code (sockets/battleSocket.js remove-player). Additive; existing
-- battles get an empty list.
ALTER TABLE "Battle" ADD COLUMN "removedIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
