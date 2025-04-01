'use server';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../server/db/schema/schema';

// This PostgreSQL database will be used for file metadata and relationships
// while the actual files will be stored in Appwrite Storage

const connectionString = process.env.DATABASE_URL!;

// Create the connection
const client = postgres(connectionString);

// Create the database instance
export const db = drizzle(client, { schema }); 