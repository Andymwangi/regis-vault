import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../drizzle/schema';

const connectionString = process.env.DATABASE_URL!;

// Create the connection
const client = postgres(connectionString);

// Create the database instance
export const db = drizzle(client, { schema }); 