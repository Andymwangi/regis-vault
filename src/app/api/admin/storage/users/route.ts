import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { users, files, departments } from '@/server/db/schema/schema';
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
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        department: departments.name,
        usedStorage: sql<number>`COALESCE(SUM(${files.size}), 0)`,
        fileCount: sql<number>`COUNT(${files.id})::int`,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(files, eq(files.userId, users.id))
      .groupBy(users.id, departments.name)
      .orderBy(sql`COALESCE(SUM(${files.size}), 0)`);

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error('Error fetching user storage data:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 