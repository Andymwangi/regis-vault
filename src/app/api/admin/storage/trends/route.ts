import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { files, departments } from '@/server/db/schema/schema';
import { sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    // Calculate the date range based on the selected period
    const dateRange = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    }[range] || 30;

    const results = await db
      .select({
        date: sql<string>`DATE_TRUNC('day', ${files.createdAt})::date`,
        totalStorage: sql<number>`SUM(${departments.allocatedStorage})`,
        usedStorage: sql<number>`SUM(${files.size})`,
      })
      .from(files)
      .innerJoin(departments, sql`${files.departmentId} = ${departments.id}`)
      .where(
        sql`${files.createdAt} >= NOW() - INTERVAL '${dateRange} days'`
      )
      .groupBy(sql`DATE_TRUNC('day', ${files.createdAt})::date`)
      .orderBy(sql`DATE_TRUNC('day', ${files.createdAt})::date`);

    return NextResponse.json({ trends: results });
  } catch (error) {
    console.error('Error fetching storage trends:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 