'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';
import { subDays } from 'date-fns';
import { Parser } from 'json2csv';

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

    // Fetch activity logs
    const logsResult = await databases.listDocuments(
      fullConfig.databaseId,
      'activity_logs',
      [
        Query.greaterThanEqual('createdAt', startDate.toISOString()),
        Query.orderDesc('createdAt'),
        Query.limit(1000) // Adjust limit as needed
      ]
    );
    
    // Process logs and get user information
    const processedLogs = await Promise.all(
      logsResult.documents.map(async (log) => {
        let userName = 'Unknown';
        let userEmail = 'unknown@example.com';
        
        try {
          if (log.userId) {
            const user = await databases.getDocument(
              fullConfig.databaseId,
              fullConfig.usersCollectionId,
              log.userId
            );
            userName = user.fullName || 'Unknown';
            userEmail = user.email || 'unknown@example.com';
          }
        } catch (error) {
          // User not found, use defaults
        }
        
        // Determine if user is active in the last 5 minutes
        const lastActive = log.createdAt;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const status = lastActive > fiveMinutesAgo ? 'active' : 'inactive';
        
        return {
          id: log.$id,
          name: userName,
          email: userEmail,
          action: log.type || 'unknown',
          details: log.description || '',
          createdAt: log.createdAt,
          lastActive: lastActive,
          status: status
        };
      })
    );

    // Convert logs to CSV format
    const fields = [
      'id',
      'name',
      'email',
      'action',
      'details',
      'createdAt',
      'lastActive',
      'status',
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(processedLogs);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="activity-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting activity logs:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 