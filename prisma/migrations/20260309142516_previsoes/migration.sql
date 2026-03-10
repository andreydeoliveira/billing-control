-- CreateTable
CREATE TABLE "Forecast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilityAccountId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "annualMonth" INTEGER,
    "timing" TEXT NOT NULL,
    "dueDay" INTEGER,
    "startsAt" DATETIME,
    "installmentsTotal" INTEGER,
    "oneTimeAt" DATETIME,
    "observation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Forecast_utilityAccountId_fkey" FOREIGN KEY ("utilityAccountId") REFERENCES "UtilityAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Forecast_utilityAccountId_idx" ON "Forecast"("utilityAccountId");

-- CreateIndex
CREATE INDEX "Forecast_status_idx" ON "Forecast"("status");
