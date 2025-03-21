import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { users, departments } from '@/server/db/schema/schema';
import { eq, and, or, like } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department');
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    // Build the where clause
    const conditions = [];

    // Add search condition if provided
    if (search) {
      conditions.push(
        or(
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }

    // Add department filter if provided
    if (department) {
      conditions.push(eq(users.departmentId, department));
    }

    // Add role filter if provided
    if (role) {
      conditions.push(eq(users.role, role));
    }

    // Add status filter if provided
    if (status) {
      conditions.push(eq(users.status, status));
    }

    // Execute query with combined conditions
    const results = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        department: {
          id: departments.id,
          name: departments.name,
        },
      })
      .from(users)
      .innerJoin(departments, eq(users.departmentId, departments.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(users.createdAt);

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 