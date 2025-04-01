'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { activityLogs, users } from '@/server/db/schema/schema';
import { eq, sql, and } from 'drizzle-orm';
import { account } from '@/lib/appwrite/config';

export async function GET() {
  try {
    // Check if user is authenticated with Appwrite
    let user;
    try {
      user = await account.get();
    } catch (error) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get users who have been active in the last 5 minutes
    const activeUsers = await db
      .select({
        id: users.id,
        name: users.name,
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