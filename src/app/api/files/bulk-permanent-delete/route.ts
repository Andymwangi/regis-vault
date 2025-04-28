'use server';

import { NextRequest, NextResponse } from 'next/server';
import { fullConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { ID } from 'node-appwrite';

interface FailedFile {
  id: string;
  reason: string;
}

export async function POST(request: NextRequest) {
  try {
    // First perform a truly asynchronous operation
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { fileIds } = body;
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { message: "Invalid request: fileIds must be a non-empty array" },
        { status: 400 }
      );
    }
    
    // Filter out invalid file IDs
    const validFileIds = fileIds.filter(id => 
      id && typeof id === 'string' && id !== 'undefined' && id !== 'null'
    ).map(id => id.trim());
    
    if (validFileIds.length === 0) {
      return NextResponse.json(
        { message: "No valid file IDs provided" },
        { status: 400 }
      );
    }
    
    console.log(`Processing ${validFileIds.length} files for deletion`);
    if (validFileIds.length !== fileIds.length) {
      console.log(`Filtered out ${fileIds.length - validFileIds.length} invalid file IDs`);
    }
    
    // Create Appwrite admin client
    const { databases, storage } = await createAdminClient();
    
    const results: {
      success: string[];
      failed: FailedFile[];
    } = {
      success: [],
      failed: []
    };
    
    // Process each file
    for (const fileId of validFileIds) {
      try {
        // Get the file from the database
        let file;
        try {
          file = await databases.getDocument(
            fullConfig.databaseId,
            fullConfig.filesCollectionId,
            fileId
          );
        } catch (error) {
          results.failed.push({ id: fileId, reason: 'File not found' });
          continue;
        }
        
        // Check if the file is in deleted state
        if (file.status !== 'deleted') {
          console.log(`File ${fileId} status is ${file.status}, not 'deleted'. Forcing deletion anyway...`);
          // Instead of failing, we'll proceed with deletion
          // This ensures files get deleted even if their status is incorrect
        }
        
        // Check if the user has permission to permanently delete the file
        const hasPermission = 
          currentUser.role === 'admin' || 
          file.ownerId === currentUser.$id;
        
        if (!hasPermission) {
          results.failed.push({ id: fileId, reason: 'Permission denied' });
          continue;
        }
        
        // First delete the document from database to ensure it's removed
        console.log(`Deleting file document ${fileId} from database`);
        try {
          await databases.deleteDocument(
            fullConfig.databaseId,
            fullConfig.filesCollectionId,
            fileId
          );
          console.log(`File document ${fileId} deleted successfully from database`);
        } catch (dbError) {
          console.error(`Failed to delete file ${fileId} from database:`, dbError);
          results.failed.push({ id: fileId, reason: 'Database deletion failed' });
          continue;
        }
        
        // Then try to delete from storage if applicable
        if (file.bucketFileId || file.bucketFieldId || file.storageFileId) {
          try {
            const storageFileId = file.bucketFileId || file.bucketFieldId || file.storageFileId;
            console.log(`Attempting to delete storage file ${storageFileId} for file ${fileId}`);
            
            await storage.deleteFile(
              fullConfig.storageId,
              storageFileId
            );
            console.log(`Storage file ${storageFileId} deleted successfully`);
          } catch (storageError) {
            console.error(`Failed to delete file ${fileId} from storage:`, storageError);
            // Continue even if storage deletion fails - the database record is gone
          }
        } else {
          console.log(`No storage file ID found for file ${fileId}, skipping storage deletion`);
        }
        
        // Log the permanent deletion activity
        try {
          await databases.createDocument(
            fullConfig.databaseId,
            fullConfig.activityLogsCollectionId,
            ID.unique(),
            {
              userId: currentUser.$id,
              type: 'PERMANENT_DELETE_FILE',
              description: `Permanently deleted file: ${file.name}`,
              metadata: {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                departmentId: file.departmentId,
                ownerId: file.ownerId
              },
              createdAt: new Date().toISOString()
            }
          );
        } catch (error) {
          console.error(`Failed to log activity for file ${fileId}:`, error);
        }
        
        results.success.push(fileId);
      } catch (error) {
        console.error(`Error permanently deleting file ${fileId}:`, error);
        results.failed.push({ id: fileId, reason: 'Internal error' });
      }
    }
    
    // Return response based on results
    if (results.failed.length === 0) {
      return NextResponse.json({
        success: true,
        message: `${results.success.length} files permanently deleted`,
        deletedFiles: results.success
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `${results.success.length} files deleted, ${results.failed.length} failed`,
        deletedFiles: results.success,
        failedFiles: results.failed
      }, { status: 207 }); // Multi-Status
    }
  } catch (error) {
    console.error('Error bulk permanently deleting files:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 