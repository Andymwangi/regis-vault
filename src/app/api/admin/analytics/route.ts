import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { Query, Models } from 'node-appwrite';
import { 
  getActivityTrends, 
  getDepartmentStorageStats, 
  getFileTypeStats, 
  getUserStorageStats 
} from '@/lib/bridge/admin-bridge';

// Define types for activity data
interface ActivityDocument extends Models.Document {
  userId: string;
  action?: string;
  type?: string;
  details?: string;
  description?: string;
  fileId?: string;
  departmentId?: string;
  createdAt: string;
}

interface ActivityCollection {
  documents: ActivityDocument[];
  total: number;
}

interface UserDocument extends Models.Document {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

interface EnrichedActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  createdAt: string;
  resourceId?: string;
  departmentId?: string;
}

export async function GET(request: Request) {
  try {
    // Verify admin permissions
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the request parameters
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('timeRange') || '30days';
    
    // Calculate time period
    let daysToFetch = 30;
    switch (timeRange) {
      case '7days':
        daysToFetch = 7;
        break;
      case '30days':
        daysToFetch = 30;
        break;
      case '90days':
        daysToFetch = 90;
        break;
      case '1year':
        daysToFetch = 365;
        break;
      default:
        daysToFetch = 30;
    }
    
    // Fetch all required data with error handling for each request
    let activityTrends: any[] = [];
    let departmentStats: any[] = [];
    let fileTypeStats: any[] = [];
    let userStorageStats: any[] = [];
    let recentActivities: ActivityCollection = { documents: [], total: 0 };
    let activitiesWithUserInfo: EnrichedActivity[] = [];
    
    try {
      activityTrends = await getActivityTrends(daysToFetch);
    } catch (error) {
      console.error('Error fetching activity trends:', error);
      activityTrends = [];
    }
    
    try {
      departmentStats = await getDepartmentStorageStats();
    } catch (error) {
      console.error('Error fetching department stats:', error);
      departmentStats = [];
    }
    
    try {
      fileTypeStats = await getFileTypeStats();
    } catch (error) {
      console.error('Error fetching file type stats:', error);
      fileTypeStats = [];
    }
    
    try {
      userStorageStats = await getUserStorageStats();
    } catch (error) {
      console.error('Error fetching user storage stats:', error);
      userStorageStats = [];
    }
    
    // Get additional statistics
    const { databases } = await createAdminClient();
    
    // Get recent activities
    try {
      recentActivities = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.activityLogsCollectionId,
        [
          Query.orderDesc('createdAt'),
          Query.limit(100)
        ]
      ) as unknown as ActivityCollection;
      
      // Enrich activities with user information
      activitiesWithUserInfo = await Promise.all(
        recentActivities.documents.map(async (activity: ActivityDocument) => {
          let userInfo = { 
            fullName: 'Unknown User',
            email: 'unknown@example.com'
          };
          
          try {
            if (activity.userId) {
              const user = await databases.getDocument(
                fullConfig.databaseId,
                fullConfig.usersCollectionId,
                activity.userId
              ) as unknown as UserDocument;
              
              userInfo = {
                fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                email: user.email
              };
            }
          } catch (error) {
            // User not found, use default values
          }
          
          return {
            id: activity.$id,
            userId: activity.userId,
            userName: userInfo.fullName,
            userEmail: userInfo.email,
            action: activity.action || activity.type || 'Unknown Action',
            details: activity.details || activity.description || 'No details available',
            createdAt: activity.createdAt,
            resourceId: activity.fileId,
            departmentId: activity.departmentId
          };
        })
      );
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
    
    // Calculate aggregate statistics
    const totalStorage = fileTypeStats.reduce((acc, curr) => acc + curr.size, 0);
    const totalFiles = fileTypeStats.reduce((acc, curr) => acc + curr.count, 0);
    const totalUsers = userStorageStats.length;
    const activeUsers = userStorageStats.filter(user => {
      const lastActiveDate = new Date(user.lastActive);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return lastActiveDate > sevenDaysAgo;
    }).length;
    
    return NextResponse.json({
      activityTrends,
      departmentStats,
      fileTypeStats,
      userStorageStats,
      recentActivities: activitiesWithUserInfo,
      summary: {
        totalStorage,
        totalFiles,
        totalUsers,
        activeUsers,
        totalActivities: recentActivities.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    // Return empty data instead of error to prevent UI from breaking
    return NextResponse.json({
      activityTrends: [],
      departmentStats: [],
      fileTypeStats: [],
      userStorageStats: [],
      recentActivities: [],
      summary: {
        totalStorage: 0,
        totalFiles: 0,
        totalUsers: 0,
        activeUsers: 0,
        totalActivities: 0
      }
    });
  }
} 