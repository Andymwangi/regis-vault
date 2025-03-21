import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runCleanup() {
  const sql = postgres(process.env.DATABASE_URL!);

  try {
    const cleanupSql = fs.readFileSync(
      path.join(process.cwd(), 'drizzle/0005_cleanup.sql'),
      'utf-8'
    );

    // Split the SQL into individual statements
    const statements = cleanupSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each statement
    for (const statement of statements) {
      console.log('Executing:', statement);
      await sql.unsafe(statement);
    }

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runCleanup(); 