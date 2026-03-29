-- CreateTable
CREATE TABLE "BankAccountMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bankAccountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "deltaCents" INTEGER NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankAccountMovement_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BankAccountMovement_bankAccountId_occurredAt_idx" ON "BankAccountMovement"("bankAccountId", "occurredAt");

-- CreateIndex
CREATE INDEX "BankAccountMovement_bankAccountId_kind_occurredAt_idx" ON "BankAccountMovement"("bankAccountId", "kind", "occurredAt");

-- CreateIndex
CREATE INDEX "BankAccountMovement_refType_refId_idx" ON "BankAccountMovement"("refType", "refId");
