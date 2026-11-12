-- Scheduled-job runs, for Admin › App health › Scheduled jobs (services/jobRuns.js).
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "ok" BOOLEAN NOT NULL,
    "summary" JSONB,
    "error" TEXT,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobRun_job_startedAt_idx" ON "JobRun"("job", "startedAt");

-- Supabase exposes public tables through its REST API; this one is server-only.
ALTER TABLE "JobRun" ENABLE ROW LEVEL SECURITY;
