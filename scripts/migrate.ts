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
    const migrationPath = path.join(process.cwd(), 'drizzle', '0010_add_departments.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    // Split SQL into individual statements, preserving DO blocks
    const statements = migrationSql
      .replace(/\r\n/g, '\n')
      .split('\n')
      .reduce((acc: string[], line) => {
        const currentStatement = acc[acc.length - 1] || '';
        
        // If we're in a DO block or the line starts with '--', append to current statement
        if (currentStatement.includes('DO $$') || line.trim().startsWith('--')) {
          acc[acc.length - 1] = (currentStatement + '\n' + line).trim();
        }
        // If line ends with semicolon and we're not in a DO block, it's a new statement
        else if (line.trim().endsWith(';')) {
          if (currentStatement) {
            acc[acc.length - 1] = (currentStatement + '\n' + line).trim();
          } else {
            acc.push(line.trim());
          }
        }
        // Otherwise append to current statement
        else {
          if (currentStatement) {
            acc[acc.length - 1] = (currentStatement + '\n' + line).trim();
          } else {
            acc.push(line.trim());
          }
        }
        return acc;
      }, [])
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