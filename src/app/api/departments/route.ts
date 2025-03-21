import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { departments } from '@/server/db/schema/schema';

export async function GET() {
  try {
    const results = await db
      .select({
        id: departments.id,
        name: departments.name,
      })
      .from(departments)
      .orderBy(departments.name);

    return NextResponse.json({ departments: results });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { message: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
} 