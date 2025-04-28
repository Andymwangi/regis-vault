'use server';

import { NextRequest, NextResponse } from 'next/server';
import { fullConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { checkUserPermission } from '@/lib/permissions';

export async function DELETE(request: NextRequest) {
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
    const { fileIds } = await request.json();
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { message: "File IDs are required" },
        { status: 400 }
      );
    }
    
    // Create Appwrite admin client
    const { databases, storage } = await createAdminClient();
    
    // Process each file
    const results = {
      success: [] as string[],
      failed: [] as string[]
    };

    for (const fileId of fileIds) {
      try {
        // Get the file to delete
        const file = await databases.getDocument(
          fullConfig.databaseId,
          fullConfig.filesCollectionId,
          fileId
        );
        
        if (!file || file.status !== 'deleted') {
          results.failed.push(fileId);
          continue;
        }
        
        // Delete from storage if it has a storage file ID
        if (file.bucketFileId) {
          try {
            await storage.deleteFile(
              fullConfig.storageId,
              file.bucketFileId
            );
          } catch (storageError) {
            console.error(`Error deleting file ${fileId} from storage:`, storageError);
            // Continue even if storage delete fails - we still want to delete the DB record
          }
        }
        
        // Delete the file record from the database
        await databases.deleteDocument(
          fullConfig.databaseId,
          fullConfig.filesCollectionId,
          fileId
        );
        
        // Log this activity
        await databases.createDocument(
          fullConfig.databaseId,
          fullConfig.activityLogsCollectionId,
          'unique()',
          {
            userId: currentUser.id,
            action: 'permanent_delete_file',
            resourceId: fileId,
            resourceType: 'file',
            details: JSON.stringify({
              fileName: file.name,
              deletedBy: currentUser.id,
              bulkOperation: true
            }),
            timestamp: new Date().toISOString()
          }
        );
        
        results.success.push(fileId);
      } catch (error) {
        console.error(`Error deleting file ${fileId}:`, error);
        results.failed.push(fileId);
      }
    }
    
    return NextResponse.json({
      message: `Deleted ${results.success.length} files permanently${results.failed.length > 0 ? `, ${results.failed.length} failed` : ''}`,
      results
    });
  } catch (error) {
    console.error('Error bulk deleting files:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 