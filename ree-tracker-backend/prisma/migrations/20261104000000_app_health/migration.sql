-- CreateTable
CREATE TABLE "AppVersionSeen" (
    "userId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppVersionSeen_pkey" PRIMARY KEY ("userId","version")
);

-- CreateTable
CREATE TABLE "AppError" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "route" TEXT,
    "version" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppVersionSeen_lastSeenAt_idx" ON "AppVersionSeen"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppError_fingerprint_key" ON "AppError"("fingerprint");

-- CreateIndex
CREATE INDEX "AppError_lastSeenAt_idx" ON "AppError"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "AppVersionSeen" ADD CONSTRAINT "AppVersionSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same as every other table: the app reaches these through its server only.
ALTER TABLE "AppVersionSeen" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppError" ENABLE ROW LEVEL SECURITY;
