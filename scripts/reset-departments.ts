import * as dotenv from 'dotenv';
dotenv.config();

import { db } from '@/lib/db/db';
import { departments } from '@/server/db/schema/schema';
import { sql } from 'drizzle-orm';

// Log the DATABASE_URL to verify it's loaded (but hide sensitive parts)
const dbUrl = process.env.DATABASE_URL || '';
const safeDbUrl = dbUrl ? dbUrl.replace(/:[^:@]*@/, ':***@') : 'Not set';
console.log('Using DATABASE_URL:', safeDbUrl);

async function resetDepartments() {
  try {
    console.log('Starting departments table reset...');

    // Drop existing table
    console.log('Dropping existing departments table...');
    await db.execute(sql`DROP TABLE IF EXISTS departments CASCADE;`);
    
    // Create the table with all required columns
    console.log('Creating departments table with correct schema...');
    await db.execute(sql`
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
    await db.execute(sql`CREATE INDEX idx_departments_name ON departments(name);`);
    
    // Insert default departments
    console.log('Inserting default departments...');
    const defaultDepartments = [
      { name: 'Finance', description: 'Financial management and accounting', allocatedStorage: 0 },
      { name: 'HR', description: 'Human Resources management', allocatedStorage: 0 },
      { name: 'Legal and Compliance', description: 'Legal affairs and regulatory compliance', allocatedStorage: 0 },
      { name: 'IT', description: 'Information Technology and systems', allocatedStorage: 0 },
      { name: 'Records Management', description: 'Document and records management', allocatedStorage: 0 },
    ];
    
    for (const dept of defaultDepartments) {
      await db.insert(departments).values(dept);
      console.log(`Added department: ${dept.name}`);
    }
    
    // Verify departments were created
    console.log('Verifying departments were created...');
    const results = await db.query.departments.findMany({
      columns: {
        id: true,
        name: true,
        description: true,
        allocatedStorage: true,
      }
    });
    
    console.log('Departments in database:', JSON.stringify(results, null, 2));
    console.log('Departments table reset completed successfully');
  } catch (error) {
    console.error('Error resetting departments table:', error);
  } finally {
    process.exit(0);
  }
}

resetDepartments(); 