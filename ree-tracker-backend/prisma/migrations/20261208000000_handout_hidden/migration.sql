-- Handouts the admin keeps but learners don't see (Admin › Handouts › Hide from
-- learners). A hidden folder hides everything inside it. Additive; everything
-- existing stays visible.
ALTER TABLE "Folder" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Material" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
