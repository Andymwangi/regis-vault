'use server';

import { NextRequest, NextResponse } from 'next/server';
import { fullConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { checkUserPermission } from '@/lib/permissions';
import { Query } from 'node-appwrite';

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
    
    // Create Appwrite admin client
    const { databases, storage } = await createAdminClient();
    
    // Get all deleted files
    const files = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [Query.equal('status', ['deleted'])]
    );
    
    if (files.total === 0) {
      return NextResponse.json({
        message: "No files in trash to delete"
      });
    }
    
    // Track results
    const results = {
      total: files.total,
      processed: 0,
      success: 0,
      failed: 0
    };
    
    // Process each file
    for (const file of files.documents) {
      try {
        results.processed++;
        
        // Delete from storage if it has a storage file ID
        if (file.bucketFileId) {
          try {
            await storage.deleteFile(
              fullConfig.storageId,
              file.bucketFileId
            );
          } catch (storageError) {
            console.error(`Error deleting file ${file.$id} from storage:`, storageError);
            // Continue even if storage delete fails - we still want to delete the DB record
          }
        }
        
        // Delete the file record from the database
        await databases.deleteDocument(
          fullConfig.databaseId,
          fullConfig.filesCollectionId,
          file.$id
        );
        
        results.success++;
      } catch (error) {
        console.error(`Error permanently deleting file ${file.$id}:`, error);
        results.failed++;
      }
    }
    
    // Log this activity
    await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.activityLogsCollectionId,
      'unique()',
      {
        userId: currentUser.id,
        action: 'empty_trash',
        resourceId: 'system',
        resourceType: 'trash',
        details: JSON.stringify({
          totalFiles: results.total,
          successfullyDeleted: results.success,
          failedDeletes: results.failed
        }),
        timestamp: new Date().toISOString()
      }
    );
    
    return NextResponse.json({
      message: `Emptied trash: deleted ${results.success} files permanently${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
      results
    });
  } catch (error) {
    console.error('Error emptying trash:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 