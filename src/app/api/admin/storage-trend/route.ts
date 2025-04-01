'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { files } from '@/server/db/schema/schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { Query } from 'appwrite';
import { account, databases, DATABASES, COLLECTIONS, sanitizeUserId } from '@/lib/appwrite/config';
import { subDays, format } from 'date-fns';

export async function GET(request: Request) {
  try {
    // Check if user is authenticated and is an admin
    try {
      const currentUser = await account.get();
      
      // Get user profile data to check role
      const userProfiles = await databases.listDocuments(
        DATABASES.MAIN,
        COLLECTIONS.DEPARTMENTS,
        [
          Query.equal('userId', sanitizeUserId(currentUser.$id))
        ]
      );
      
      if (userProfiles.documents.length === 0 || 
          userProfiles.documents[0].role !== 'admin') {
        return NextResponse.json({ message: 'Unauthorized - Admin access required' }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = parseInt(searchParams.get('timeRange') || '30');
    const dateLimit = subDays(new Date(), timeRange);

    // Get daily storage usage for the time range
    const storageData = await db
      .select({
        date: sql<string>`date_trunc('day', ${files.createdAt})::date`,
        usage: sql<number>`sum(size)`
      })
      .from(files)
      .where(
        and(
          eq(files.status, 'active'),
          gte(files.createdAt, dateLimit)
        )
      )
      .groupBy(sql`date_trunc('day', ${files.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${files.createdAt})::date`)
      .execute();

    // Format the data for the chart
    const formattedData = storageData.map((item: { date: string, usage: number }) => ({
      month: format(new Date(item.date), 'MMM d'),
      usage: Math.round(item.usage / (1024 * 1024 * 1024)) // Convert to GB
    }));

    return NextResponse.json({ data: formattedData });
  } catch (error) {
    console.error('Error fetching storage trend:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 