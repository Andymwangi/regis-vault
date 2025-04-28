'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';

export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin role
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const timeRange = parseInt(searchParams.get('timeRange') || '30');

    // Get total users count
    const usersResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      []
    );
    
    // Get total storage used
    const filesResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [Query.equal('status', ['active'])]
    );
    
    const totalStorage = filesResult.documents.reduce(
      (sum, file) => sum + (file.size || 0),
      0
    );

    // Get active sessions - for Appwrite, we'll use activity logs from last 15 minutes
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);
    
    const activeSessionsResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.activityLogsCollectionId,  // Added comma here
      [
        Query.greaterThan('createdAt', fifteenMinutesAgo.toISOString())
      ]
    );
    
    // Count unique users with activity in the last 15 minutes
    const activeUsers = new Set<string>();
    activeSessionsResult.documents.forEach(log => {
      if (log.userId) {
        activeUsers.add(log.userId);
      }
    });

    return NextResponse.json({
      totalUsers: usersResult.total,
      totalStorage: totalStorage,
      activeSessions: activeUsers.size
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}