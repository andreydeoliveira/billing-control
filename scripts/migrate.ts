import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function migrate() {
  try {
    console.log('🔄 Executando migração...');
    
    const migrationSQL = readFileSync(
      join(process.cwd(), 'migrations', '001_create_accounts_table.sql'),
      'utf-8'
    );
    
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migração executada com sucesso!');
    console.log('📊 Tabela expense_income_accounts criada');
    
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
