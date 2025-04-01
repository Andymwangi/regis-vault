const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL not found in environment variables");
  process.exit(1);
}

console.log("Using database URL:", databaseUrl.replace(/:([^:@]+)@/, ':***@'));

// Import SQL migrations
const migrationFiles = [
  '0017_update_user_schema.sql',
  '0018_fix_password_trigger.sql',
  '0019_remove_required_firstname_lastname.sql'
];

async function runMigrations() {
  try {
    console.log("Starting database migrations...");
    
    // Connect to the database
    const client = postgres(databaseUrl);
    
    // Execute each migration in sequence
    for (const migrationFile of migrationFiles) {
      console.log(`Executing migration: ${migrationFile}`);
      try {
        const sql = fs.readFileSync(path.join(__dirname, migrationFile), 'utf8');
        await client.unsafe(sql);
        console.log(`Migration ${migrationFile} executed successfully`);
      } catch (error) {
        console.error(`Error executing migration ${migrationFile}:`, error);
        console.log("Continuing with next migration...");
      }
    }
    
    await client.end();
    console.log("All migrations completed");
    process.exit(0);
  } catch (error) {
    console.error("Migration process failed:", error);
    process.exit(1);
  }
}

runMigrations(); 