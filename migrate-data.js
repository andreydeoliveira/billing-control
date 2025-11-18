const { Client } = require('pg');

require('dotenv').config();

const VERCEL_DATABASE_URL = process.env.VERCEL_DATABASE_URL;
const LOCAL_DATABASE_URL = process.env.DATABASE_URL;

if (!VERCEL_DATABASE_URL) {
    console.error('❌ VERCEL_DATABASE_URL não encontrada no arquivo .env');
    process.exit(1);
}

if (!LOCAL_DATABASE_URL) {
    console.error('❌ DATABASE_URL não encontrada no arquivo .env');
    process.exit(1);
}

async function migrateData() {
    console.log('🔄 Iniciando migração de dados...\n');

    const localClient = new Client({ connectionString: LOCAL_DATABASE_URL });
    const vercelClient = new Client({
        connectionString: VERCEL_DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await localClient.connect();
        await vercelClient.connect();
        console.log('✅ Conectado aos dois bancos\n');

        // Definir ordem de tabelas respeitando foreign keys
        const tablesToMigrate = [
            { local: 'users', vercel: 'users' },
            { local: 'sessions', vercel: 'sessions' },
            { local: 'verification_tokens', vercel: 'verification_tokens' },
            { local: 'financial_controls', vercel: 'financial_controls' },
            { local: 'financial_control_users', vercel: 'financial_control_users' },
            { local: 'financial_control_invites', vercel: 'financial_control_invites' },
            { local: 'account_classifications', vercel: 'account_classifications' },
            { local: 'expense_income_accounts', vercel: 'expense_income_accounts' },
            { local: 'provisioned_transactions', vercel: 'provisioned_transactions' },
            { local: 'bank_accounts', vercel: 'bank_accounts' },
            { local: 'bank_account_monthly_balances', vercel: 'bank_account_monthly_balances' },
            { local: 'cards', vercel: 'cards' },
            { local: 'card_invoices', vercel: 'card_invoices' },
            { local: 'monthly_transactions', vercel: 'monthly_transactions' },
            { local: 'transfers', vercel: 'transfers' },
            { local: 'accounts', vercel: 'accounts' }
        ];

        console.log(`📊 Migrando ${tablesToMigrate.length} tabelas...\n`);

        for (const table of tablesToMigrate) {
            const { local: localTableName, vercel: vercelTableName } = table;

            try {
                console.log(`📋 Tabela: ${localTableName.replace(/"/g, '')} → ${vercelTableName}`);

                // Contar registros no banco local
                const countResult = await localClient.query(`SELECT COUNT(*) as count FROM ${localTableName}`);
                const count = parseInt(countResult.rows[0].count);

                if (count === 0) {
                    console.log(`   ⏭️  Sem dados, pulando...\n`);
                    continue;
                }

                console.log(`   📦 ${count} registros encontrados`);

                // Buscar todos os dados
                const dataResult = await localClient.query(`SELECT * FROM ${localTableName}`);
                const data = dataResult.rows;

                if (data.length > 0) {
                    // Limpar tabela no Vercel
                    await vercelClient.query(`DELETE FROM ${vercelTableName}`);
                    console.log(`   🗑️  Tabela limpa no Vercel`);

                    // Inserir dados
                    let inserted = 0;
                    for (const row of data) {
                        const columns = Object.keys(row);
                        const values = Object.values(row);

                        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
                        const columnNames = columns.map(c => `"${c}"`).join(', ');

                        const query = `INSERT INTO ${vercelTableName} (${columnNames}) VALUES (${placeholders})`;

                        try {
                            await vercelClient.query(query, values);
                            inserted++;

                            if (inserted % 10 === 0 || inserted === data.length) {
                                console.log(`   ✓ ${inserted}/${data.length} registros`);
                            }
                        } catch (err) {
                            console.error(`   ⚠️  Erro ao inserir:`, err.message);
                        }
                    }

                    console.log(`   ✅ ${inserted} registros migrados\n`);
                }

            } catch (error) {
                console.error(`   ❌ Erro na tabela ${localTableName}:`, error.message);
                console.log(`   Continuando...\n`);
            }
        } console.log('\n✅ Migração concluída!');
        console.log('\n📋 Próximos passos:');
        console.log('1. Atualize o .env:');
        console.log('   DATABASE_URL="${VERCEL_DATABASE_URL}"');
        console.log('2. Teste: npm run dev');
        console.log('3. Deploy: vercel --prod');

    } catch (error) {
        console.error('\n❌ Erro:', error.message);
    } finally {
        await localClient.end();
        await vercelClient.end();
    }
}

migrateData();
