import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { activityLogs } from '@/server/db/schema/schema';
import { sql, gte } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { subDays, format } from 'date-fns';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
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

    // Get daily activity trends
    const trends = await db
      .select({
        date: sql<string>`DATE(${activityLogs.createdAt})`,
        activeUsers: sql<number>`COUNT(DISTINCT user_id)`,
        totalActions: sql<number>`COUNT(*)`,
      })
      .from(activityLogs)
      .where(gte(activityLogs.createdAt, startDate))
      .groupBy(sql`DATE(${activityLogs.createdAt})`)
      .orderBy(sql`DATE(${activityLogs.createdAt})`);

    // Format dates for display
    const formattedTrends = trends.map(trend => ({
      ...trend,
      date: format(new Date(trend.date), 'MMM dd'),
    }));

    return NextResponse.json({ trends: formattedTrends });
  } catch (error) {
    console.error('Error fetching activity trends:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 