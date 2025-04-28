'use server';

import { NextRequest, NextResponse } from 'next/server';
import { fullConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { checkUserPermission } from '@/lib/permissions';

export async function POST(request: NextRequest) {
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
    
    // Parse request body
    const { fileIds, restoreTarget, departmentId } = await request.json();
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { message: "File IDs are required" },
        { status: 400 }
      );
    }
    
    // Create Appwrite admin client
    const { databases } = await createAdminClient();
    
    // Process each file
    const results = {
      success: [] as string[],
      failed: [] as string[]
    };
    
    // Prepare update data
    const updateData: Record<string, any> = {
      status: 'active',
      deletedBy: null
    };
    
    // If restoring to a different department
    if (restoreTarget === 'custom' && departmentId) {
      updateData.departmentId = departmentId;
    }

    for (const fileId of fileIds) {
      try {
        // Get the file to restore
        const file = await databases.getDocument(
          fullConfig.databaseId,
          fullConfig.filesCollectionId,
          fileId
        );
        
        if (!file || file.status !== 'deleted') {
          results.failed.push(fileId);
          continue;
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
              targetDepartment: restoreTarget === 'custom' ? departmentId : file.departmentId,
              bulkOperation: true
            }),
            timestamp: new Date().toISOString()
          }
        );
        
        results.success.push(fileId);
      } catch (error) {
        console.error(`Error restoring file ${fileId}:`, error);
        results.failed.push(fileId);
      }
    }
    
    return NextResponse.json({
      message: `Restored ${results.success.length} files successfully${results.failed.length > 0 ? `, ${results.failed.length} failed` : ''}`,
      results
    });
  } catch (error) {
    console.error('Error bulk restoring files:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 