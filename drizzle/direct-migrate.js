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
const schemaUpdateSql = fs.readFileSync(path.join(__dirname, '0017_update_user_schema.sql'), 'utf8');
const triggerFixSql = fs.readFileSync(path.join(__dirname, '0018_fix_password_trigger.sql'), 'utf8');

async function runMigration() {
  try {
    console.log("Starting database migration...");
    
    // Connect to the database
    const client = postgres(databaseUrl);
    
    // Execute the migrations
    console.log("Executing schema update migration...");
    try {
      // Run the schema update SQL statements
      await client.unsafe(schemaUpdateSql);
      console.log("Schema update executed successfully");
      
      // Run the trigger fix SQL statements
      console.log("Executing trigger fix migration...");
      await client.unsafe(triggerFixSql);
      console.log("Trigger fix executed successfully");
    } catch (error) {
      console.error("Error executing migration:", error);
      throw error;
    } finally {
      await client.end();
    }
    
    console.log("Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration(); 