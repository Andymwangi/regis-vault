import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { activityLogs, users } from '@/server/db/schema/schema';
import { eq, sql, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get users who have been active in the last 5 minutes
    const activeUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        lastActivity: sql<string>`MAX(${activityLogs.createdAt})`,
        currentAction: sql<string>`(
          SELECT action
          FROM ${activityLogs}
          WHERE user_id = ${users.id}
          ORDER BY created_at DESC
          LIMIT 1
        )`,
      })
      .from(users)
      .innerJoin(
        activityLogs,
        and(
          eq(activityLogs.userId, users.id),
          sql`${activityLogs.createdAt} > NOW() - INTERVAL '5 minutes'`
        )
      )
      .groupBy(users.id)
      .orderBy(sql`MAX(${activityLogs.createdAt})`);

    return NextResponse.json({ users: activeUsers });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 