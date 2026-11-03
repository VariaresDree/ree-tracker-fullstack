-- The board's items per topic, as Admin sets them. Null keeps PRC's current table.
ALTER TABLE "SystemConfig" ADD COLUMN "boardBlueprint" JSONB;
