import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db/db';
import { departments } from '@/server/db/schema/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const departmentList = await db
      .select({
        id: departments.id,
        name: departments.name,
      })
      .from(departments)
      .orderBy(asc(departments.name));

    return NextResponse.json({ departments: departmentList });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
} 