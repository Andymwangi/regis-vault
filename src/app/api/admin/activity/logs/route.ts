'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';
import { subDays } from 'date-fns';

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
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const userId = searchParams.get('user') || 'all';

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

    // Build query
    const queries = [
      Query.greaterThanEqual('createdAt', startDate.toISOString()),
      Query.orderDesc('createdAt')
    ];

    // Add user filter if provided
    if (userId !== 'all') {
      queries.push(Query.equal('userId', [userId]));
    }

    // Get logs
    const logsResult = await databases.listDocuments(
      fullConfig.databaseId,
      'activity_logs',
      queries
    );

    // Get user details for each log
    const logs = await Promise.all(logsResult.documents.map(async (log) => {
      let user = null;
      try {
        user = await databases.getDocument(
          fullConfig.databaseId,
          fullConfig.usersCollectionId,
          log.userId
        );
      } catch (error) {
        // User not found
      }

      // Determine if user is active (activity in last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const status = log.createdAt > fiveMinutesAgo ? 'active' : 'inactive';

      return {
        id: log.$id,
        userId: log.userId,
        name: user ? user.fullName : 'Unknown',
        email: user ? user.email : 'unknown@example.com',
        action: log.type || log.action,
        details: log.description || log.details,
        createdAt: log.createdAt,
        lastActive: log.createdAt,
        status
      };
    }));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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
    
    // Extract logId from request
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('id');
    
    if (!logId) {
      return NextResponse.json(
        { message: 'Log ID is required' },
        { status: 400 }
      );
    }

    // Get the log
    try {
      const log = await databases.getDocument(
        fullConfig.databaseId,
        'activity_logs',
        logId
      );
      
      // Check if log is for inactive user (no activity in last 7 days)
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      
      if (log.createdAt > sevenDaysAgo) {
        return NextResponse.json(
          { message: 'Cannot delete logs for active users' },
          { status: 400 }
        );
      }
      
      // Delete the log
      await databases.deleteDocument(
        fullConfig.databaseId,
        'activity_logs',
        logId
      );
      
      return NextResponse.json({ message: 'Activity log deleted successfully' });
    } catch (error) {
      return NextResponse.json(
        { message: 'Activity log not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error deleting activity log:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 