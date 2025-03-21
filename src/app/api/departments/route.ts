import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { departments, users, files } from '@/server/db/schema/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const results = await db
      .select({
        id: departments.id,
        name: departments.name,
        description: departments.description,
        memberCount: sql<number>`count(${users.id})::int`,
        fileCount: sql<number>`count(${files.id})::int`,
      })
      .from(departments)
      .leftJoin(users, eq(users.departmentId, departments.id))
      .leftJoin(files, eq(files.departmentId, departments.id))
      .groupBy(departments.id)
      .orderBy(departments.name);

    return NextResponse.json({ departments: results });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 