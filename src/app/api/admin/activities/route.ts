import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { activities, users } from '@/server/db/schema/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { formatDistanceToNow } from 'date-fns';

export async function GET(request: Request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.department !== 'Management') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get recent activities with user information
    const recentActivities = await db
      .select({
        id: activities.id,
        activity: activities.description,
        createdAt: activities.createdAt,
        user: {
          id: users.id,
          name: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
          avatar: users.avatarUrl
        }
      })
      .from(activities)
      .innerJoin(users, eq(activities.userId, users.id))
      .orderBy(desc(activities.createdAt))
      .limit(10)
      .execute();

    // Format the activities data
    const formattedActivities = recentActivities.map(activity => ({
      id: activity.id,
      activity: activity.activity,
      user: {
        id: activity.user.id,
        name: activity.user.name,
        avatar: activity.user.avatar
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