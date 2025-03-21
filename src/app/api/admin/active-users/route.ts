import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { users, activities, departments } from '@/server/db/schema/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { formatDistanceToNow } from 'date-fns';

export async function GET(request: Request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.department !== 'Management') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get users with their latest activity and department info
    const activeUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatarUrl,
        department: departments.name,
        lastActive: sql<Date>`max(${activities.createdAt})`
      })
      .from(users)
      .innerJoin(activities, eq(activities.userId, users.id))
      .innerJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.status, 'active'))
      .groupBy(users.id, users.firstName, users.lastName, users.avatarUrl, departments.name)
      .orderBy(desc(sql`max(${activities.createdAt})`))
      .limit(5)
      .execute();

    // Format the users data
    const formattedUsers = activeUsers.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      department: user.department,
      lastActive: formatDistanceToNow(new Date(user.lastActive), { addSuffix: true })
    }));

    return NextResponse.json({ activeUsers: formattedUsers });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 