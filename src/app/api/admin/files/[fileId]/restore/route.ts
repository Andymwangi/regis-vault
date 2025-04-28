'use server';

import { NextRequest, NextResponse } from 'next/server';
import { fullConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { checkUserPermission } from '@/lib/permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    // Check if user is authenticated and has admin permissions
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const isAdmin = await checkUserPermission(currentUser.id, 'admin');
    if (!isAdmin) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }
    
    const fileId = params.fileId;
    if (!fileId) {
      return NextResponse.json(
        { message: "File ID is required" },
        { status: 400 }
      );
    }
    
    // Parse request body
    const { restoreTarget, departmentId } = await request.json();
    
    // Create Appwrite admin client
    const { databases } = await createAdminClient();
    
    // Get the file to restore
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    if (!file || file.status !== 'deleted') {
      return NextResponse.json(
        { message: "File not found or not in trash" },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData: Record<string, any> = {
      status: 'active',
      deletedBy: null
    };
    
    // If restoring to a different department
    if (restoreTarget === 'custom' && departmentId) {
      updateData.departmentId = departmentId;
    }
    
    // Update the file status and department if needed
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId,
      updateData
    );
    
    // Log this activity
    await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.activityLogsCollectionId,
      'unique()',
      {
        userId: currentUser.id,
        action: 'restore_file',
        resourceId: fileId,
        resourceType: 'file',
        details: JSON.stringify({
          fileName: file.name,
          restoredBy: currentUser.id,
          restoreTarget: restoreTarget,
          targetDepartment: restoreTarget === 'custom' ? departmentId : file.departmentId
        }),
        timestamp: new Date().toISOString()
      }
    );
    
    return NextResponse.json({
      message: "File restored successfully",
      file: {
        id: fileId,
        name: file.name
      }
    });
  } catch (error) {
    console.error('Error restoring file:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 