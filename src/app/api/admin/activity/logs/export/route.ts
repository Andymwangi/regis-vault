'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { activityLogs, users } from '@/server/db/schema/schema';
import { eq, gte, sql } from 'drizzle-orm';
import { account } from '@/lib/appwrite/config';
import { subDays } from 'date-fns';
import { Parser } from 'json2csv';

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

    // Fetch activity logs with user information
    const logs = await db
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
      .where(gte(activityLogs.createdAt, startDate))
      .groupBy(activityLogs.id, users.id)
      .orderBy(activityLogs.createdAt);

    // Convert logs to CSV format
    const fields = [
      'id',
      'name',
      'email',
      'action',
      'details',
      'createdAt',
      'lastActive',
      'status',
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(logs);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="activity-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting activity logs:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 