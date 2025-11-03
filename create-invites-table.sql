-- Criar tabela de convites pendentes para membros de controle financeiro
-- Execute este SQL no seu banco de dados PostgreSQL

CREATE TABLE IF NOT EXISTS financial_control_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_control_id UUID NOT NULL REFERENCES financial_controls(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_financial_control_invites_control_id 
ON financial_control_invites(financial_control_id);

CREATE INDEX IF NOT EXISTS idx_financial_control_invites_email 
ON financial_control_invites(email);

-- Comentários para documentação
COMMENT ON TABLE financial_control_invites IS 'Convites pendentes para usuários que ainda não se registraram no sistema';
COMMENT ON COLUMN financial_control_invites.email IS 'Email do usuário convidado (que ainda não tem conta)';
COMMENT ON COLUMN financial_control_invites.invited_by IS 'ID do usuário que fez o convite';
