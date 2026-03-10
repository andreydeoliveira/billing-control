/*
  Warnings:

  - You are about to drop the column `annualMonth` on the `Forecast` table. All the data in the column will be lost.
  - You are about to drop the column `period` on the `Forecast` table. All the data in the column will be lost.
  - You are about to drop the column `timing` on the `Forecast` table. All the data in the column will be lost.
  - Added the required column `kind` to the `Forecast` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Forecast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilityAccountId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "startsAt" DATETIME,
    "dueDay" INTEGER,
    "installmentsTotal" INTEGER,
    "oneTimeAt" DATETIME,
    "observation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Forecast_utilityAccountId_fkey" FOREIGN KEY ("utilityAccountId") REFERENCES "UtilityAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Forecast" ("amountCents", "createdAt", "dueDay", "id", "installmentsTotal", "observation", "oneTimeAt", "startsAt", "status", "updatedAt", "utilityAccountId") SELECT "amountCents", "createdAt", "dueDay", "id", "installmentsTotal", "observation", "oneTimeAt", "startsAt", "status", "updatedAt", "utilityAccountId" FROM "Forecast";
DROP TABLE "Forecast";
ALTER TABLE "new_Forecast" RENAME TO "Forecast";
CREATE INDEX "Forecast_utilityAccountId_idx" ON "Forecast"("utilityAccountId");
CREATE INDEX "Forecast_status_idx" ON "Forecast"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
