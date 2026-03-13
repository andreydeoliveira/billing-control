-- CreateTable
CREATE TABLE "ForecastMonthOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "forecastId" TEXT NOT NULL,
    "month" DATETIME NOT NULL,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "cardConfirmedAmountCents" INTEGER,
    "cardConfirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ForecastMonthOverride_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "Forecast" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ForecastMonthOverride_month_idx" ON "ForecastMonthOverride"("month");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastMonthOverride_forecastId_month_key" ON "ForecastMonthOverride"("forecastId", "month");
