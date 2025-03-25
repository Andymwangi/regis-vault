import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { departments } from '@/server/db/schema/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

export async function GET() {
  console.log('Departments API called');

  try {
    // Test database connection first
    try {
      await db.query.departments.findFirst({
        columns: {
          id: true,
          name: true,
          description: true,
          allocatedStorage: true,
        }
      });
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      throw new Error('Database connection failed');
    }

    // Fetch all departments
    const results = await db.query.departments.findMany({
      columns: {
        id: true,
        name: true,
        description: true,
        allocatedStorage: true,
      },
      orderBy: (departments, { asc }) => [asc(departments.name)],
    });

    console.log('API: Fetched departments:', JSON.stringify(results, null, 2));

    if (!results || results.length === 0) {
      console.log('No departments found in database');
      // Insert default departments if none exist
      const defaultDepartments = [
        { name: 'Finance', description: 'Financial management and accounting', allocatedStorage: 0 },
        { name: 'HR', description: 'Human Resources management', allocatedStorage: 0 },
        { name: 'Legal and Compliance', description: 'Legal affairs and regulatory compliance', allocatedStorage: 0 },
        { name: 'IT', description: 'Information Technology and systems', allocatedStorage: 0 },
        { name: 'Records Management', description: 'Document and records management', allocatedStorage: 0 },
      ];

      for (const dept of defaultDepartments) {
        const existing = await db.query.departments.findFirst({
          where: eq(departments.name, dept.name),
        });

        if (!existing) {
          await db.insert(departments).values(dept);
          console.log(`Added department: ${dept.name}`);
        }
      }

      // Fetch departments again after inserting defaults
      const updatedResults = await db.query.departments.findMany({
        columns: {
          id: true,
          name: true,
          description: true,
          allocatedStorage: true,
        },
        orderBy: (departments, { asc }) => [asc(departments.name)],
      });

      return new NextResponse(
        JSON.stringify({ departments: updatedResults || [] }),
        {
          status: 200,
          headers,
        }
      );
    }

    return new NextResponse(
      JSON.stringify({ departments: results || [] }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    console.error('API Error:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to fetch departments',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers,
      }
    );
  }
} 