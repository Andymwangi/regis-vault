'use server';

import { NextRequest, NextResponse } from 'next/server';
import { account, databases, storage, fullConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { ID } from 'node-appwrite';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validate that we have a proper file ID
    if (!params.id || params.id === 'undefined' || params.id === 'null' || params.id.trim() === '') {
      console.error(`Invalid file ID provided: ${params.id}`);
      return NextResponse.json({ 
        error: 'Invalid file ID provided', 
        receivedId: params.id 
      }, { status: 400 });
    }
    
    console.log(`Starting permanent delete for file ID: ${params.id}`);
    
    // Get URL parameters
    const url = new URL(request.url);
    const forceDelete = url.searchParams.get('force') === 'true';
    
    console.log(`Force delete mode: ${forceDelete}`);
    
    // First perform a truly asynchronous operation
    const currentUser = await getCurrentUser();
    
    // Now it's safe to use params
    const fileId = params.id.trim(); // Trim any whitespace
    console.log(`Processing permanent delete request for file: ${fileId}`);
    
    if (!currentUser) {
      console.log('Unauthorized: No current user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log(`User authenticated: ${currentUser.$id}, role: ${currentUser.role || 'unknown'}`);

    const { databases, storage } = await createAdminClient();
    console.log('Admin client created successfully');
    
    // Get the file from the database
    let file: any; // Use any type to avoid TypeScript errors with force delete mode
    try {
      console.log(`Fetching file document: ${fileId} from collection ${fullConfig.filesCollectionId}`);
      console.log(`Using database ID: ${fullConfig.databaseId}`);
      file = await databases.getDocument(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        fileId
      );
      console.log(`File document found: ${file.name}, status: ${file.status}`);
    } catch (error) {
      console.error('Error fetching file document:', error);
      
      if (forceDelete) {
        console.log('Force delete mode enabled - continuing with deletion attempt despite error');
        // Create a minimal file object with just the ID
        file = { $id: fileId, name: 'Unknown file', type: 'unknown', status: 'unknown' };
      } else {
        return NextResponse.json({ 
          error: 'File not found', 
          fileId: fileId,
          details: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 404 });
      }
    }

    // Check if the file is in deleted state
    if (file.status !== 'deleted' && !forceDelete) {
      console.log(`File status is ${file.status}, not 'deleted'. Forcing deletion anyway...`);
      // Instead of returning an error, we'll proceed with deletion
      // This ensures files get deleted even if their status is incorrect
    }

    // Check if the user has permission to permanently delete the file
    // Bypass permission check in force mode
    if (!forceDelete) {
      const hasPermission = 
        currentUser.role === 'admin' || 
        file.ownerId === currentUser.$id;
      
      if (!hasPermission) {
        console.log(`Access denied. User ${currentUser.$id} cannot delete file owned by ${file.ownerId}`);
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      console.log('Force delete mode enabled - bypassing permission checks');
    }

    // Get the correct storage file ID from various possible field names
    const storageFileId = file.bucketFileId || file.bucketFieldId || file.storageFileId;
    console.log(`Storage file ID identified: ${storageFileId || 'none'}`);
    console.log(`Storage bucket ID: ${fullConfig.storageId}`);
    
    // First delete the document from database to ensure it's removed
    console.log(`Deleting file document from database: ${fileId}`);
    try {
      const deleteResult = await databases.deleteDocument(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        fileId
      );
      console.log(`Database document deleted successfully, result:`, deleteResult);
    } catch (dbError) {
      console.error('Failed to delete file from database:', dbError);
      console.error('Database error details:', JSON.stringify(dbError));
      
      if (!forceDelete) {
        return NextResponse.json({ error: 'Failed to delete file from database' }, { status: 500 });
      } else {
        console.log('Force delete mode enabled - continuing despite database deletion error');
      }
    }
    
    // Then try to delete from storage if applicable
    if (storageFileId) {
      try {
        console.log(`Attempting to delete file from storage: ${storageFileId}`);
        const storageDeleteResult = await storage.deleteFile(
          fullConfig.storageId,
          storageFileId
        );
        console.log(`Storage file deleted successfully, result:`, storageDeleteResult);
      } catch (storageError) {
        console.error('Failed to delete file from storage:', storageError);
        console.error('Storage error details:', JSON.stringify(storageError));
        
        if (forceDelete) {
          console.log('Force delete mode enabled - attempting direct delete with file ID as storage ID');
          // As a last resort, try to delete using the file ID as storage ID
          try {
            await storage.deleteFile(
              fullConfig.storageId,
              fileId
            );
            console.log('Storage file deleted using file ID as storage ID');
          } catch (lastResortError) {
            console.error('Final storage deletion attempt failed:', lastResortError);
          }
        }
      }
    } else if (forceDelete) {
      // In force mode, try to delete storage using the file ID as a last resort
      console.log('No storage file ID found but force mode enabled - attempting direct delete with file ID');
      try {
        await storage.deleteFile(
          fullConfig.storageId,
          fileId
        );
        console.log('Storage file deleted using file ID');
      } catch (lastResortError) {
        console.error('Direct storage deletion attempt failed:', lastResortError);
      }
    } else {
      console.log('No storage file ID found, skipping storage deletion');
    }

    // Log the permanent deletion activity
    try {
      console.log('Logging permanent delete activity');
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
      console.log('Activity logged successfully');
    } catch (error) {
      console.error('Failed to log activity:', error);
    }

    console.log('Permanent delete completed successfully');
    return NextResponse.json({ 
      success: true,
      message: 'File permanently deleted'
    });
  } catch (error) {
    console.error('Error permanently deleting file:', error);
    console.error('Full error details:', JSON.stringify(error));
    return NextResponse.json(
      { error: 'Failed to permanently delete file' },
      { status: 500 }
    );
  }
} 