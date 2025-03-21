import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  idle_timeout: 20,
});

async function migrate() {
  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'drizzle', '0006_direct_uuid_conversion.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    // Split SQL into individual statements
    const statements = migrationSql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    // Execute each statement
    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
        console.log('Successfully executed statement:', statement.substring(0, 100) + '...');
      } catch (error) {
        console.error('Error executing statement:', statement.substring(0, 100) + '...');
        console.error('Error details:', error);
        throw error;
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate(); 