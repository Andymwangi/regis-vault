import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigration() {
  const sql = postgres(process.env.DATABASE_URL!);

  try {
    const migrationSql = fs.readFileSync(
      path.join(process.cwd(), 'drizzle/0005_fix_uuid_conversion_raw.sql'),
      'utf-8'
    );

    // Split the SQL into individual statements
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each statement
    for (const statement of statements) {
      console.log('Executing:', statement);
      await sql.unsafe(statement);
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration(); 