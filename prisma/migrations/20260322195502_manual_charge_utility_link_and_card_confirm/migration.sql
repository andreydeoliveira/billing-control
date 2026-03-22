-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ManualCharge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" DATETIME NOT NULL,
    "utilityAccountId" TEXT,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDay" INTEGER,
    "occurredAt" DATETIME,
    "cardConfirmedAmountCents" INTEGER,
    "cardConfirmedAt" DATETIME,
    "creditCardId" TEXT,
    "paidAt" DATETIME,
    "bankAccountId" TEXT,
    "paidAmountCents" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManualCharge_utilityAccountId_fkey" FOREIGN KEY ("utilityAccountId") REFERENCES "UtilityAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ManualCharge_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ManualCharge_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ManualCharge" ("amountCents", "bankAccountId", "createdAt", "creditCardId", "description", "dueDay", "id", "month", "occurredAt", "paidAmountCents", "paidAt", "updatedAt") SELECT "amountCents", "bankAccountId", "createdAt", "creditCardId", "description", "dueDay", "id", "month", "occurredAt", "paidAmountCents", "paidAt", "updatedAt" FROM "ManualCharge";
DROP TABLE "ManualCharge";
ALTER TABLE "new_ManualCharge" RENAME TO "ManualCharge";
CREATE INDEX "ManualCharge_month_idx" ON "ManualCharge"("month");
CREATE INDEX "ManualCharge_utilityAccountId_idx" ON "ManualCharge"("utilityAccountId");
CREATE INDEX "ManualCharge_creditCardId_month_idx" ON "ManualCharge"("creditCardId", "month");
CREATE INDEX "ManualCharge_bankAccountId_paidAt_idx" ON "ManualCharge"("bankAccountId", "paidAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
