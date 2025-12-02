import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load .env.local first, then .env as fallback
config({ path: '.env.local' });
config({ path: '.env' });

// Desabilita verificação de certificado autoassinado para Supabase
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: true,
  },
});
