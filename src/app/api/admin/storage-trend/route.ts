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
      return NextResponse.json({ message: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const timeRange = parseInt(searchParams.get('timeRange') || '30');
    const dateLimit = subDays(new Date(), timeRange).toISOString();

    // Get files created within timeRange
    const filesResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [
        Query.equal('status', ['active']),
        Query.greaterThanEqual('createdAt', dateLimit)
      ]
    );

    // Group files by date and calculate storage usage
    const storageByDate = new Map();
    
    filesResult.documents.forEach(file => {
      const date = file.createdAt.split('T')[0]; // Get YYYY-MM-DD portion
      const fileSize = file.size || 0;
      
      if (!storageByDate.has(date)) {
        storageByDate.set(date, 0);
      }
      
      storageByDate.set(date, storageByDate.get(date) + fileSize);
    });

    // Format the data for the chart
    const formattedData = Array.from(storageByDate.entries())
      .map(([date, usage]) => ({
        date,
        month: format(parseISO(date), 'MMM d'),
        usage: Math.round(usage / (1024 * 1024 * 1024)) // Convert to GB
      }))
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    return NextResponse.json({ data: formattedData });
  } catch (error) {
    console.error('Error fetching storage trend:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 