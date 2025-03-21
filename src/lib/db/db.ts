// src/lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/server/db/schema/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Create the connection
const client = postgres(process.env.DATABASE_URL);

// Create the database instance
export const db = drizzle(client, { schema });

// Export the pool for direct query access if needed
export const pgPool = client;