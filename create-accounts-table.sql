-- Tabela de contas para transações (ex: Luz, Água, Internet, Uber, Alimentação)
CREATE TABLE IF NOT EXISTS expense_income_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  financial_control_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'expense' ou 'income'
  color TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  CONSTRAINT fk_financial_control
    FOREIGN KEY (financial_control_id)
    REFERENCES financial_controls(id)
    ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_expense_income_accounts_financial_control_id ON expense_income_accounts(financial_control_id);
CREATE INDEX IF NOT EXISTS idx_expense_income_accounts_type ON expense_income_accounts(type);
CREATE INDEX IF NOT EXISTS idx_expense_income_accounts_is_active ON expense_income_accounts(is_active);

-- Adicionar coluna account_id em provisioned_transactions (OBRIGATÓRIO)
ALTER TABLE provisioned_transactions
ADD COLUMN IF NOT EXISTS account_id UUID NOT NULL,
ADD CONSTRAINT fk_provisioned_transactions_account
  FOREIGN KEY (account_id)
  REFERENCES expense_income_accounts(id)
  ON DELETE RESTRICT;

-- Adicionar coluna account_id em monthly_transactions (OBRIGATÓRIO)
ALTER TABLE monthly_transactions
ADD COLUMN IF NOT EXISTS account_id UUID NOT NULL,
ADD CONSTRAINT fk_monthly_transactions_account
  FOREIGN KEY (account_id)
  REFERENCES expense_income_accounts(id)
  ON DELETE RESTRICT;

-- Comentários
COMMENT ON TABLE expense_income_accounts IS 'Contas para organização de transações (ex: Luz, Água, Uber, Alimentação)';
COMMENT ON COLUMN expense_income_accounts.name IS 'Nome da conta (ex: Luz, Água, Internet, Uber)';
COMMENT ON COLUMN expense_income_accounts.type IS 'Tipo da conta: expense (despesa) ou income (receita)';
COMMENT ON COLUMN expense_income_accounts.color IS 'Cor em hexadecimal para identificação visual (#RRGGBB)';
COMMENT ON COLUMN expense_income_accounts.icon IS 'Nome do ícone para identificação visual';
COMMENT ON COLUMN expense_income_accounts.is_active IS 'Se a conta está ativa ou arquivada';
