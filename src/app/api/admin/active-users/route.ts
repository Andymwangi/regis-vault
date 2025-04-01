'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, departments, activityLogs } from '@/server/db/schema/schema';
import { eq, sql } from 'drizzle-orm';
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

    const results = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        
        department: departments.name,
        lastActive: sql<string>`MAX(${activityLogs.createdAt})`,
        status: sql<'active' | 'inactive'>`CASE
          WHEN MAX(${activityLogs.createdAt}) > NOW() - INTERVAL '5 minutes'
          THEN 'active'
          ELSE 'inactive'
        END`,
      })
      .from(users)
      .leftJoin(activityLogs, eq(activityLogs.userId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .groupBy(users.id, users.name, users.email, departments.name)
      .orderBy(sql`MAX(${activityLogs.createdAt}) DESC NULLS LAST`);

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 