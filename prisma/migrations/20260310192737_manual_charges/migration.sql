-- CreateTable
CREATE TABLE "ManualCharge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDay" INTEGER,
    "creditCardId" TEXT,
    "paidAt" DATETIME,
    "bankAccountId" TEXT,
    "paidAmountCents" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManualCharge_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ManualCharge_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ManualCharge_month_idx" ON "ManualCharge"("month");

-- CreateIndex
CREATE INDEX "ManualCharge_creditCardId_month_idx" ON "ManualCharge"("creditCardId", "month");

-- CreateIndex
CREATE INDEX "ManualCharge_bankAccountId_paidAt_idx" ON "ManualCharge"("bankAccountId", "paidAt");
