import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db/db';
import { users, departments } from '@/server/db/schema/schema';
import { and, eq, like, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Get current user's department
    const userDepartment = await db.query.departments.findFirst({
      where: eq(departments.name, session.user.department),
    });

    if (!userDepartment) {
      return NextResponse.json(
        { message: 'Department not found' },
        { status: 404 }
      );
    }

    // Search users based on role and department
    const searchResults = await db.query.users.findMany({
      where: and(
        // Don't include the current user
        or(
          like(users.firstName, `%${query}%`),
          like(users.lastName, `%${query}%`),
          like(users.email, `%${query}%`)
        ),
        session.user.role === 'admin'
          ? undefined // Admins can see all users
          : eq(users.departmentId, userDepartment.id.toString()), // Regular users can only see users in their department
        eq(users.status, 'active')
      ),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
      with: {
        department: {
          columns: {
            name: true,
          },
        },
      },
      limit: 10,
    });

    const formattedUsers = searchResults.map(user => ({
      id: user.id.toString(),
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      department: user.department?.name || 'N/A',
      avatar: user.avatarUrl,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { message: 'Failed to search users' },
      { status: 500 }
    );
  }
} 