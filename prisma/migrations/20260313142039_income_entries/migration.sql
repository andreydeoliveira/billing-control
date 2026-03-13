-- CreateTable
CREATE TABLE "IncomeSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "observation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IncomeForecast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incomeSourceId" TEXT NOT NULL,
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
    CONSTRAINT "IncomeForecast_incomeSourceId_fkey" FOREIGN KEY ("incomeSourceId") REFERENCES "IncomeSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncomeReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incomeForecastId" TEXT NOT NULL,
    "incomeSourceId" TEXT NOT NULL,
    "month" DATETIME NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "receivedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IncomeReceipt_incomeForecastId_fkey" FOREIGN KEY ("incomeForecastId") REFERENCES "IncomeForecast" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IncomeReceipt_incomeSourceId_fkey" FOREIGN KEY ("incomeSourceId") REFERENCES "IncomeSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IncomeReceipt_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IncomeSource_status_idx" ON "IncomeSource"("status");

-- CreateIndex
CREATE INDEX "IncomeForecast_incomeSourceId_idx" ON "IncomeForecast"("incomeSourceId");

-- CreateIndex
CREATE INDEX "IncomeForecast_status_idx" ON "IncomeForecast"("status");

-- CreateIndex
CREATE INDEX "IncomeReceipt_month_idx" ON "IncomeReceipt"("month");

-- CreateIndex
CREATE INDEX "IncomeReceipt_incomeSourceId_month_idx" ON "IncomeReceipt"("incomeSourceId", "month");

-- CreateIndex
CREATE INDEX "IncomeReceipt_bankAccountId_receivedAt_idx" ON "IncomeReceipt"("bankAccountId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeReceipt_incomeForecastId_month_key" ON "IncomeReceipt"("incomeForecastId", "month");
