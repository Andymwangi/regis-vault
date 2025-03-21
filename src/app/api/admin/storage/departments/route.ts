import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { departments, users, files } from '@/server/db/schema/schema';
import { eq, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const results = await db
      .select({
        id: departments.id,
        name: departments.name,
        allocatedStorage: departments.allocatedStorage,
        usedStorage: sql<number>`COALESCE(SUM(${files.size}), 0)`,
        userCount: sql<number>`COUNT(DISTINCT ${users.id})::int`,
        fileCount: sql<number>`COUNT(${files.id})::int`,
      })
      .from(departments)
      .leftJoin(users, eq(users.departmentId, departments.id))
      .leftJoin(files, eq(files.departmentId, departments.id))
      .groupBy(departments.id)
      .orderBy(departments.name);

    return NextResponse.json({ departments: results });
  } catch (error) {
    console.error('Error fetching department storage data:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 