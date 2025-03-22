import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { departments } from '@/server/db/schema/schema';

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
      await db.query.departments.findFirst();
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
      },
      orderBy: (departments, { asc }) => [asc(departments.name)],
    });

    console.log('API: Fetched departments:', JSON.stringify(results, null, 2));

    if (!results || results.length === 0) {
      console.log('No departments found in database');
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