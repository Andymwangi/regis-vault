'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';
import { formatDistanceToNow } from 'date-fns';

export async function GET(request: Request) {
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

    // Get recent activities
    const activitiesResult = await databases.listDocuments(
      fullConfig.databaseId,
      'activity_logs', // Use your activity logs collection
      [
        Query.orderDesc('createdAt'),
        Query.limit(10)
      ]
    );

    // Fetch user information for each activity
    const formattedActivities = await Promise.all(
      activitiesResult.documents.map(async (activity) => {
        // Get user info
        let user = null;
        try {
          user = await databases.getDocument(
            fullConfig.databaseId,
            fullConfig.usersCollectionId,
            activity.userId
          );
        } catch (error) {
          // User not found
        }

        // Get user's department if available
        let department = null;
        if (user && user.department) {
          try {
            department = await databases.getDocument(
              fullConfig.databaseId,
              'departments',
              user.department
            );
          } catch (error) {
            // Department not found
          }
        }

        return {
          id: activity.$id,
          type: activity.type,
          description: activity.description,
          metadata: activity.metadata || {},
          user: user ? {
            id: user.$id,
            name: user.fullName,
            role: user.role,
            department: department ? department.name : 'Unknown'
          } : null,
          time: activity.createdAt ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }) : 'Unknown'
        };
      })
    );

    return NextResponse.json({ activities: formattedActivities });
  } catch (error) {
    console.error('Error fetching system activities:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 