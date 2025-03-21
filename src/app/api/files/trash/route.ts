import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { files, users, departments } from '@/server/db/schema/schema';
import { eq, and, or, like } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department');

    // Build the where clause
    const whereClause = eq(files.status, 'deleted');

    // Add search condition if provided
    const searchCondition = search
      ? or(
          like(files.name, `%${search}%`),
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`)
        )
      : undefined;

    // Add department filter if provided
    const departmentCondition = department
      ? eq(departments.id, parseInt(department))
      : undefined;

    // Combine all conditions
    const finalWhereClause = and(
      whereClause,
      ...(searchCondition ? [searchCondition] : []),
      ...(departmentCondition ? [departmentCondition] : [])
    );

    // Execute query with combined conditions
    const results = await db
      .select({
        id: files.id,
        name: files.name,
        type: files.type,
        size: files.size,
        url: files.url,
        createdAt: files.createdAt,
        updatedAt: files.updatedAt,
        status: files.status,
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        department: {
          id: departments.id,
          name: departments.name,
        },
      })
      .from(files)
      .innerJoin(users, eq(files.userId, users.id))
      .innerJoin(departments, eq(files.departmentId, departments.id))
      .where(finalWhereClause)
      .orderBy(files.updatedAt);

    return NextResponse.json({ files: results });
  } catch (error) {
    console.error('Error fetching trashed files:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 