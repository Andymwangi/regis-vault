const { Client } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('Database URL found, connecting...');

const client = new Client({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to database successfully');

    // Check current users table structure
    console.log('Checking users table structure...');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('Current users table structure:');
    tableInfo.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}, nullable: ${col.is_nullable}, default: ${col.column_default}`);
    });

    // Option 1: Make password_hash nullable
    console.log('Making password_hash nullable...');
    try {
      await client.query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;');
      console.log('Successfully made password_hash nullable');
    } catch (error) {
      console.error('Error making password_hash nullable:', error);
    }

    // Option 2: Set default value for password_hash to be the same as password
    console.log('Updating password_hash to match password for all users...');
    try {
      await client.query(`
        UPDATE users 
        SET password_hash = password 
        WHERE password_hash IS NULL AND password IS NOT NULL;
      `);
      console.log('Successfully updated password_hash values');
    } catch (error) {
      console.error('Error updating password_hash values:', error);
    }

    // Option 3: Add a trigger to automatically copy password to password_hash
    console.log('Creating trigger to auto-copy password to password_hash...');
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION copy_password_to_hash()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.password IS NOT NULL AND NEW.password_hash IS NULL THEN
            NEW.password_hash := NEW.password;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        DROP TRIGGER IF EXISTS password_copy_trigger ON users;
        
        CREATE TRIGGER password_copy_trigger
        BEFORE INSERT OR UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION copy_password_to_hash();
      `);
      console.log('Successfully created password copy trigger');
    } catch (error) {
      console.error('Error creating password copy trigger:', error);
    }

    console.log('Users table fix completed successfully');
  } catch (error) {
    console.error('Error fixing users table:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

main(); 