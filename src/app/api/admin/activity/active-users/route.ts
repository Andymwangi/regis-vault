'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';

export async function GET() {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin role
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { databases } = await createAdminClient();
    
    // Calculate timestamp for 5 minutes ago
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    // Get recent activity logs
    const recentLogs = await databases.listDocuments(
      fullConfig.databaseId,
      'activity_logs',
      [
        Query.greaterThan('createdAt', fiveMinutesAgo.toISOString()),
        Query.orderDesc('createdAt')
      ]
    );
    
    // Group by user ID to find active users
    const userActivities = new Map();
    
    for (const log of recentLogs.documents) {
      if (!log.userId) continue;
      
      if (!userActivities.has(log.userId)) {
        userActivities.set(log.userId, {
          userId: log.userId,
          lastActivity: log.createdAt,
          currentAction: log.type || log.description
        });
      }
    }
    
    // Get user details for active users
    const activeUsers = await Promise.all(
      Array.from(userActivities.values()).map(async (activity) => {
        try {
          const user = await databases.getDocument(
            fullConfig.databaseId,
            fullConfig.usersCollectionId,
            activity.userId
          );
          
          return {
            id: user.$id,
            name: user.fullName,
            email: user.email,
            lastActivity: activity.lastActivity,
            currentAction: activity.currentAction
          };
        } catch (error) {
          console.error(`Error fetching user ${activity.userId}:`, error);
          return null;
        }
      })
    );
    
    // Filter out nulls (users that couldn't be found)
    const validUsers = activeUsers.filter(user => user !== null);
    
    return NextResponse.json({ users: validUsers });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 