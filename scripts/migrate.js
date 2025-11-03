const { default: postgres } = require('postgres');
require('dotenv').config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

async function migrate() {
    try {
        console.log('🔄 Criando tabela expense_income_accounts...');

        await sql`
      CREATE TABLE IF NOT EXISTS expense_income_accounts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        financial_control_id UUID NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
        color TEXT,
        icon TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        
        CONSTRAINT fk_financial_control
          FOREIGN KEY (financial_control_id)
          REFERENCES financial_controls(id)
          ON DELETE CASCADE
      )
    `;

        console.log('✅ Tabela criada!');

        console.log('🔄 Criando índices...');

        await sql`
      CREATE INDEX IF NOT EXISTS idx_expense_income_accounts_financial_control_id 
        ON expense_income_accounts(financial_control_id)
    `;

        await sql`
      CREATE INDEX IF NOT EXISTS idx_expense_income_accounts_type 
        ON expense_income_accounts(type)
    `;

        await sql`
      CREATE INDEX IF NOT EXISTS idx_expense_income_accounts_is_active 
        ON expense_income_accounts(is_active)
    `;

        console.log('✅ Índices criados!');
        console.log('🎉 Migração concluída com sucesso!');

    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

migrate();
