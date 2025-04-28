'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';
import { subDays, format, parseISO } from 'date-fns';

export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin role
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
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

    // Get activity logs
    const logs = await databases.listDocuments(
      fullConfig.databaseId,
      'activity_logs',
      [
        Query.greaterThanEqual('createdAt', startDate.toISOString()),
        Query.orderAsc('createdAt'),
        Query.limit(1000) // Adjust limit as needed
      ]
    );

    // Group logs by date
    const groupedByDate = new Map();
    const usersByDate = new Map();

    logs.documents.forEach(log => {
      const dateStr = log.createdAt.split('T')[0]; // Extract YYYY-MM-DD
      
      // Count total actions per day
      if (!groupedByDate.has(dateStr)) {
        groupedByDate.set(dateStr, 0);
        usersByDate.set(dateStr, new Set());
      }
      groupedByDate.set(dateStr, groupedByDate.get(dateStr) + 1);
      
      // Count unique users per day
      if (log.userId) {
        usersByDate.get(dateStr).add(log.userId);
      }
    });

    // Format the trend data
    const trends = Array.from(groupedByDate.entries()).map(([dateStr, count]) => ({
      date: format(parseISO(dateStr), 'MMM dd'),
      activeUsers: usersByDate.get(dateStr).size,
      totalActions: count
    }));

    return NextResponse.json({ trends });
  } catch (error) {
    console.error('Error fetching activity trends:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 