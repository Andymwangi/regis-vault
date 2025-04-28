import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check admin role
    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Requires admin access' },
        { status: 403 }
      );
    }
    
    // Get the Appwrite client
    const { databases } = await createAdminClient();
    
    // Get users
    const usersResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.limit(100)]
    );
    
    // Get files
    const filesResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [Query.equal('status', ['active'])]
    );
    
    // Get departments for reference
    const departmentsResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      []
    );
    
    // Create department name lookup
    const departmentNames: Record<string, string> = {};
    departmentsResult.documents.forEach(dept => {
      departmentNames[dept.$id] = dept.name;
    });
    
    // Calculate storage usage for each user
    const users = usersResult.documents.map(user => {
      // Get files belonging to this user - using ownerId
      const userFiles = filesResult.documents.filter(file => file.ownerId === user.$id);
      
      // Calculate total storage and file count
      const usedStorage = userFiles.reduce((sum, file) => sum + (file.size || 0), 0);
      const fileCount = userFiles.length;
      
      return {
        id: user.$id,
        firstName: user.firstName || user.fullName?.split(' ')[0] || '',
        lastName: user.lastName || (user.fullName?.split(' ').slice(1).join(' ') || ''),
        email: user.email,
        department: departmentNames[user.department] || 'None',
        usedStorage,
        fileCount
      };
    });
    
    // Return users with storage data
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}