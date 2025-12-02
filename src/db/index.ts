import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

config({ path: '.env' }); // or .env.local

// Prioriza POSTGRES_URL_NON_POOLING (Vercel) → POSTGRES_URL
const dbUrl =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL;

if (!dbUrl) {
  throw new Error(
    'No database URL found. Set POSTGRES_URL_NON_POOLING or POSTGRES_URL.'
  );
}

const client = postgres(dbUrl);
export const db = drizzle({ client, schema });
