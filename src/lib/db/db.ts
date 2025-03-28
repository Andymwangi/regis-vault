// src/lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/server/db/schema/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Configure database connection with SSL
const client = postgres(process.env.DATABASE_URL, {
  max: process.env.NODE_ENV === 'production' ? 10 : 1,
  ssl: {
    rejectUnauthorized: false
  }
});

// Create the database instance
export const db = drizzle(client, { schema });

// Export the pool for direct query access if needed
export const pgPool = client;