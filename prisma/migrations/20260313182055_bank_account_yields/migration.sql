-- CreateTable
CREATE TABLE "BankAccountYieldRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bankAccountId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "month" DATETIME NOT NULL,
    "valueCents" INTEGER NOT NULL,
    "deltaCents" INTEGER NOT NULL,
    "recordedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BankAccountYieldRecord_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "yieldMode" TEXT NOT NULL DEFAULT 'NONE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_BankAccount" ("balanceCents", "bank", "createdAt", "id", "name", "status", "updatedAt") SELECT "balanceCents", "bank", "createdAt", "id", "name", "status", "updatedAt" FROM "BankAccount";
DROP TABLE "BankAccount";
ALTER TABLE "new_BankAccount" RENAME TO "BankAccount";
CREATE INDEX "BankAccount_status_idx" ON "BankAccount"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BankAccountYieldRecord_bankAccountId_recordedAt_idx" ON "BankAccountYieldRecord"("bankAccountId", "recordedAt");

-- CreateIndex
CREATE INDEX "BankAccountYieldRecord_bankAccountId_month_recordedAt_idx" ON "BankAccountYieldRecord"("bankAccountId", "month", "recordedAt");
