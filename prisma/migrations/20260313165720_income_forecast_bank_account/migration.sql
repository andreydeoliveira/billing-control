-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IncomeForecast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incomeSourceId" TEXT NOT NULL,
    "bankAccountId" TEXT,
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
    CONSTRAINT "IncomeForecast_incomeSourceId_fkey" FOREIGN KEY ("incomeSourceId") REFERENCES "IncomeSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IncomeForecast_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_IncomeForecast" ("amountCents", "createdAt", "dueDay", "id", "incomeSourceId", "installmentsTotal", "kind", "observation", "oneTimeAt", "startsAt", "status", "updatedAt") SELECT "amountCents", "createdAt", "dueDay", "id", "incomeSourceId", "installmentsTotal", "kind", "observation", "oneTimeAt", "startsAt", "status", "updatedAt" FROM "IncomeForecast";
DROP TABLE "IncomeForecast";
ALTER TABLE "new_IncomeForecast" RENAME TO "IncomeForecast";
CREATE INDEX "IncomeForecast_incomeSourceId_idx" ON "IncomeForecast"("incomeSourceId");
CREATE INDEX "IncomeForecast_bankAccountId_idx" ON "IncomeForecast"("bankAccountId");
CREATE INDEX "IncomeForecast_status_idx" ON "IncomeForecast"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
