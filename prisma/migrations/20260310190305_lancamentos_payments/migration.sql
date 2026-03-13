-- CreateTable
CREATE TABLE "ForecastCardAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "forecastId" TEXT NOT NULL,
    "month" DATETIME NOT NULL,
    "creditCardId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ForecastCardAssignment_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "Forecast" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ForecastCardAssignment_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UtilityPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "forecastId" TEXT NOT NULL,
    "month" DATETIME NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UtilityPayment_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "Forecast" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UtilityPayment_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditCardInvoicePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creditCardId" TEXT NOT NULL,
    "month" DATETIME NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CreditCardInvoicePayment_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CreditCardInvoicePayment_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromBankAccountId" TEXT NOT NULL,
    "toBankAccountId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "transferAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BankTransfer_fromBankAccountId_fkey" FOREIGN KEY ("fromBankAccountId") REFERENCES "BankAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BankTransfer_toBankAccountId_fkey" FOREIGN KEY ("toBankAccountId") REFERENCES "BankAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ForecastCardAssignment_month_idx" ON "ForecastCardAssignment"("month");

-- CreateIndex
CREATE INDEX "ForecastCardAssignment_creditCardId_month_idx" ON "ForecastCardAssignment"("creditCardId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastCardAssignment_forecastId_month_key" ON "ForecastCardAssignment"("forecastId", "month");

-- CreateIndex
CREATE INDEX "UtilityPayment_month_idx" ON "UtilityPayment"("month");

-- CreateIndex
CREATE INDEX "UtilityPayment_bankAccountId_paidAt_idx" ON "UtilityPayment"("bankAccountId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "UtilityPayment_forecastId_month_key" ON "UtilityPayment"("forecastId", "month");

-- CreateIndex
CREATE INDEX "CreditCardInvoicePayment_month_idx" ON "CreditCardInvoicePayment"("month");

-- CreateIndex
CREATE INDEX "CreditCardInvoicePayment_bankAccountId_paidAt_idx" ON "CreditCardInvoicePayment"("bankAccountId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCardInvoicePayment_creditCardId_month_key" ON "CreditCardInvoicePayment"("creditCardId", "month");

-- CreateIndex
CREATE INDEX "BankTransfer_transferAt_idx" ON "BankTransfer"("transferAt");

-- CreateIndex
CREATE INDEX "BankTransfer_fromBankAccountId_idx" ON "BankTransfer"("fromBankAccountId");

-- CreateIndex
CREATE INDEX "BankTransfer_toBankAccountId_idx" ON "BankTransfer"("toBankAccountId");
