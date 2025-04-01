const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL not found in environment variables");
  process.exit(1);
}

console.log("Using database URL:", databaseUrl.replace(/:([^:@]+)@/, ':***@'));

// SQL to fix the password trigger
const triggerFixSql = `
-- Drop the function and associated triggers
DROP FUNCTION IF EXISTS copy_password_to_hash() CASCADE;
        
-- Recreate the function with proper text type handling
CREATE OR REPLACE FUNCTION copy_password_to_hash()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.password IS NOT NULL AND NEW.password <> '' THEN
        -- Use explicit casting to handle text/varchar type differences
        NEW.password := NEW.password::text;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
        
-- Recreate the trigger with proper handling
CREATE TRIGGER password_hash_trigger
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION copy_password_to_hash();
`;

async function fixTrigger() {
  let client;
  try {
    console.log("Starting database trigger fix...");
    
    // Connect to the database
    client = postgres(databaseUrl);
    
    // Execute the trigger fix
    console.log("Executing trigger fix...");
    await client.unsafe(triggerFixSql);
    console.log("Trigger fix executed successfully");
    
    console.log("Fix completed successfully");
  } catch (error) {
    console.error("Fix failed:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

fixTrigger(); 