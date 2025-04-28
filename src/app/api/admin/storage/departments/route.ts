import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';

export async function GET(): Promise<NextResponse> {
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
    
    // Get all departments
    const departmentsResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      [Query.orderAsc('name')]
    );
    
    // Get all users and files
    const usersResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      []
    );
    
    const filesResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [Query.equal('status', ['active'])]
    );
    
    // Calculate stats for each department
    const departmentStats = await Promise.all(
      departmentsResult.documents.map(async (dept) => {
        // Count users in department
        const deptUsers = usersResult.documents.filter(
          user => user.department === dept.$id
        );
        
        // Count and sum files in department
        const deptFiles = filesResult.documents.filter(
          file => file.departmentId === dept.$id
        );
        
        const usedStorage = deptFiles.reduce((sum, file) => sum + (file.size || 0), 0);
        
        return {
          id: dept.$id,
          name: dept.name,
          allocatedStorage: dept.allocatedStorage || 0,
          usedStorage,
          userCount: deptUsers.length,
          fileCount: deptFiles.length
        };
      })
    );
    
    return NextResponse.json({ departments: departmentStats });
  } catch (error) {
    console.error('Error fetching department storage data:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { departmentId: string } }
): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { departmentId } = params;
    const { allocatedStorage } = await request.json();
    
    const { databases } = await createAdminClient();
    
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      departmentId,
      { allocatedStorage }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating department storage:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}