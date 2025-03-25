const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
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

    // Drop the departments table if it exists
    console.log('Dropping existing departments table...');
    await client.query('DROP TABLE IF EXISTS departments CASCADE');

    // Create the departments table with all required columns
    console.log('Creating departments table with correct schema...');
    await client.query(`
      CREATE TABLE departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        allocated_storage INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index
    console.log('Creating index on departments name...');
    await client.query('CREATE INDEX idx_departments_name ON departments(name)');

    // Insert default departments
    console.log('Inserting default departments...');
    const defaultDepartments = [
      { name: 'Finance', description: 'Financial management and accounting' },
      { name: 'HR', description: 'Human Resources management' },
      { name: 'Legal and Compliance', description: 'Legal affairs and regulatory compliance' },
      { name: 'IT', description: 'Information Technology and systems' },
      { name: 'Records Management', description: 'Document and records management' }
    ];

    for (const dept of defaultDepartments) {
      await client.query(
        'INSERT INTO departments (name, description, allocated_storage) VALUES ($1, $2, $3)',
        [dept.name, dept.description, 0]
      );
      console.log(`Added department: ${dept.name}`);
    }

    // Verify departments were created
    console.log('Verifying departments were created...');
    const result = await client.query('SELECT * FROM departments');
    console.log('Departments in database:', JSON.stringify(result.rows, null, 2));

    console.log('Database fix completed successfully');
  } catch (error) {
    console.error('Error fixing database:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

main(); 