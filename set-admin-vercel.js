const { Client } = require('pg');
require('dotenv').config();

async function setAdminVercel() {
    const client = new Client({
        connectionString: process.env.VERCEL_DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Conectado ao banco Vercel\n');

        // Atualizar usuário para admin
        const result = await client.query(
            `UPDATE users SET role = 'admin' WHERE email = 'andrey.oliveirasg@gmail.com' RETURNING email, role`
        );

        if (result.rows.length > 0) {
            console.log('✅ Usuário atualizado para admin na Vercel:');
            console.log('   Email:', result.rows[0].email);
            console.log('   Role:', result.rows[0].role);
        } else {
            console.log('⚠️  Usuário não encontrado');
        }

        await client.end();
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await client.end();
        process.exit(1);
    }
}

setAdminVercel();
