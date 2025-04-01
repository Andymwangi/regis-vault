'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { activities, users, departments } from '@/server/db/schema/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { formatDistanceToNow } from 'date-fns';
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

    // Get recent activities with user information
    const recentActivities = await db
      .select({
        id: activities.id,
        type: activities.type,
        description: activities.description,
        metadata: activities.metadata,
        createdAt: activities.createdAt,
        user: {
          id: users.id,
          name: users.name,
          role: users.role,
          department: departments.name
        }
      })
      .from(activities)
      .innerJoin(users, eq(activities.userId, users.id))
      .innerJoin(departments, eq(users.departmentId, departments.id))
      .orderBy(desc(activities.createdAt))
      .limit(10)
      .execute();

    // Format the activities data
    const formattedActivities = recentActivities.map((activity: any) => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      metadata: activity.metadata,
      user: {
        id: activity.user.id,
        name: activity.user.name,
        role: activity.user.role,
        department: activity.user.department
      },
      time: activity.createdAt ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }) : 'Unknown'
    }));

    return NextResponse.json({ activities: formattedActivities });
  } catch (error) {
    console.error('Error fetching system activities:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 