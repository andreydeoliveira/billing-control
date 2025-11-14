-- Remove color field from expense_income_accounts table
ALTER TABLE "expense_income_accounts" DROP COLUMN IF EXISTS "color";
