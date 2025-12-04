import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Load .env.local first (dev override), then .env (fallback)
config({ path: '.env.local' });
config({ path: '.env' });

// Prioriza POSTGRES_URL_NON_POOLING (Vercel) → POSTGRES_URL
const dbUrl =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL;

if (!dbUrl) {
  throw new Error(
    'No database URL found. Set POSTGRES_URL_NON_POOLING or POSTGRES_URL.'
  );
}

// Configurar timeout para evitar travamentos indefinidos
const client = postgres(dbUrl, {
  // Timeout de 10 segundos para conexão
  connect_timeout: 10,
  // Timeout de 30 segundos por query (idle_timeout)
  idle_timeout: 30,
  // Máximo de 30 minutos por conexão
  max_lifetime: 30 * 60,
});
export const db = drizzle({ client, schema });
