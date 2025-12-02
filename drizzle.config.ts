import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Tenta carregar variáveis de .env.local; se não existir, faz fallback para .env
const local = dotenv.config({ path: '.env.local' });
if (local.error) {
  dotenv.config({ path: '.env' });
}

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
