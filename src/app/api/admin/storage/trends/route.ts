import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';
import { subDays, format, parseISO } from 'date-fns';

// Define a type for trend data
interface TrendData {
  date: string;
  totalStorage: number;
  usedStorage: number;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin role
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: Requires admin access' }, { status: 403 });
    }
    
    const { databases } = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    
    // Calculate the date range based on the selected period
    const dateRange = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    }[range] || 30;
    
    const dateLimit = subDays(new Date(), dateRange).toISOString();
    
    // Get departments for their storage allocations
    const departmentsResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      []
    );
    
    // Calculate total allocated storage across all departments
    const totalAllocatedStorage = departmentsResult.documents.reduce(
      (sum, dept) => sum + (dept.allocatedStorage || 0), 0
    );
    
    // Get files created within timeRange
    const filesResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [
        Query.equal('status', ['active']),
        Query.greaterThanEqual('createdAt', dateLimit)
      ]
    );
    
    // Fill in dates for the entire range (to avoid gaps in chart)
    const trends: TrendData[] = [];
    for (let i = 0; i <= dateRange; i++) {
      const date = format(subDays(new Date(), dateRange - i), 'yyyy-MM-dd');
      trends.push({
        date,
        totalStorage: Math.round(totalAllocatedStorage / (1024 * 1024 * 1024)), // Convert to GB
        usedStorage: 0 // Will be updated below
      });
    }
    
    // Calculate cumulative storage used for each date
    let cumulativeStorage = 0;
    filesResult.documents.forEach(file => {
      const date = file.createdAt.split('T')[0]; // Get YYYY-MM-DD portion
      const fileSize = file.size || 0;
      cumulativeStorage += fileSize;
      
      // Find the corresponding date in our trends array
      const trendIndex = trends.findIndex(t => t.date === date);
      if (trendIndex !== -1) {
        // Add file size to used storage
        trends[trendIndex].usedStorage += fileSize / (1024 * 1024 * 1024); // Convert to GB
      }
      
      // Also update all future dates with the new cumulative storage
      for (let i = trendIndex + 1; i < trends.length; i++) {
        trends[i].usedStorage += fileSize / (1024 * 1024 * 1024);
      }
    });
    
    // Make sure all values are properly rounded
    trends.forEach(trend => {
      trend.totalStorage = Math.round(trend.totalStorage * 100) / 100;
      trend.usedStorage = Math.round(trend.usedStorage * 100) / 100;
    });
    
    return NextResponse.json({ trends });
  } catch (error) {
    console.error('Error fetching storage trends:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}