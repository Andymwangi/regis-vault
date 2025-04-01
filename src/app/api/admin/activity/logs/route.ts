'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { activityLogs, users } from '@/server/db/schema/schema';
import { eq, and, or, like, sql, gte, lte } from 'drizzle-orm';
import { subDays } from 'date-fns';
import { account } from '@/lib/appwrite/config';

export async function GET(request: Request) {
  try {
    // Check if user is authenticated with Appwrite
    let user;
    try {
      user = await account.get();
    } catch (error) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const userId = searchParams.get('user') || 'all';

    // Calculate date range based on timeRange parameter
    const now = new Date();
    let startDate: Date;
    switch (timeRange) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      default: // 24h
        startDate = subDays(now, 1);
    }

    // Build the where clause
    const whereClause = gte(activityLogs.createdAt, startDate);

    // Add user filter if provided
    const userCondition = userId !== 'all'
      ? eq(users.id, userId)
      : undefined;

    // Combine conditions
    const finalWhereClause = and(
      whereClause,
      ...(userCondition ? [userCondition] : [])
    );

    // Execute query with combined conditions
    const results = await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        name: users.name,
        email: users.email,
        action: activityLogs.action,
        details: activityLogs.details,
        createdAt: activityLogs.createdAt,
        lastActive: sql<string>`(
          SELECT MAX(created_at)
          FROM ${activityLogs}
          WHERE user_id = ${activityLogs.userId}
        )`,
        status: sql<'active' | 'inactive'>`CASE
          WHEN MAX(${activityLogs.createdAt}) > NOW() - INTERVAL '5 minutes'
          THEN 'active'
          ELSE 'inactive'
        END`,
      })
      .from(activityLogs)
      .innerJoin(users, eq(activityLogs.userId, users.id))
      .where(finalWhereClause)
      .groupBy(activityLogs.id, users.id)
      .orderBy(activityLogs.createdAt);

    return NextResponse.json({ logs: results });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated with Appwrite
    let user;
    try {
      user = await account.get();
    } catch (error) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const logId = parseInt(params.id);

    // Check if the log is for an inactive user (no activity in the last 7 days)
    const log = await db
      .select({
        lastActive: sql<string>`MAX(created_at)`,
      })
      .from(activityLogs)
      .where(eq(activityLogs.id, sql`${logId.toString()}::uuid`))
      .groupBy(activityLogs.id)
      .limit(1);

    if (!log.length) {
      return NextResponse.json(
        { message: 'Activity log not found' },
        { status: 404 }
      );
    }

    const lastActive = new Date(log[0].lastActive);
    const sevenDaysAgo = subDays(new Date(), 7);

    if (lastActive > sevenDaysAgo) {
      return NextResponse.json(
        { message: 'Cannot delete logs for active users' },
        { status: 400 }
      );
    }

    await db
      .delete(activityLogs)
      .where(eq(activityLogs.id, sql`${logId.toString()}::uuid`));

    return NextResponse.json({ message: 'Activity log deleted successfully' });
  } catch (error) {
    console.error('Error deleting activity log:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 