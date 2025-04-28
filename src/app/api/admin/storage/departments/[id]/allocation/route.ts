import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';

// Add type definitions for the parameters
export async function PATCH(
  request: Request,
  { params }: { params: { departmentId: string } }
) {
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

    const { departmentId } = params;
    const { allocatedStorage } = await request.json();
    
    if (!departmentId || allocatedStorage === undefined) {
      return NextResponse.json(
        { message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { databases } = await createAdminClient();
    
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      departmentId,
      { allocatedStorage }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating department storage allocation:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}