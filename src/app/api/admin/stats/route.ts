'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, files, sessions } from '@/server/db/schema/schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { Query } from 'appwrite';
import { account, databases, DATABASES, COLLECTIONS, sanitizeUserId } from '@/lib/appwrite/config';
import { subDays } from 'date-fns';

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

    // Get total users count
    const totalUsersCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .execute();

    // Get total storage used
    const totalStorage = await db
      .select({
        total: sql<number>`sum(size)`
      })
      .from(files)
      .where(eq(files.status, 'active'))
      .execute();

    // Get active sessions count
    const activeSessions = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(
        and(
          eq(sessions.active, true),
          gte(sessions.lastActivity, new Date(Date.now() - 1000 * 60 * 15)) // Active in last 15 minutes
        )
      )
      .execute();

    return NextResponse.json({
      totalUsers: totalUsersCount[0]?.count || 0,
      totalStorage: totalStorage[0]?.total || 0,
      activeSessions: activeSessions[0]?.count || 0
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 