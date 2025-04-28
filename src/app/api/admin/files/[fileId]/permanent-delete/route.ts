'use server';

import { NextRequest, NextResponse } from 'next/server';
import { fullConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { checkUserPermission } from '@/lib/permissions';

export async function DELETE(
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
    
    // Now it's safe to use params
    const fileId = params.fileId;
    if (!fileId) {
      return NextResponse.json(
        { message: "File ID is required" },
        { status: 400 }
      );
    }
    
    // Create Appwrite admin client
    const { databases, storage } = await createAdminClient();
    
    // Get the file to delete
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

    // Permanently delete the file from storage if it has a storage file ID
    if (file.bucketFileId) {
      try {
        await storage.deleteFile(
          fullConfig.storageId,
          file.bucketFileId
        );
      } catch (storageError) {
        console.error('Error deleting file from storage:', storageError);
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
          deletedBy: currentUser.id
        }),
        timestamp: new Date().toISOString()
      }
    );
    
    return NextResponse.json({
      message: "File permanently deleted successfully"
    });
  } catch (error) {
    console.error('Error permanently deleting file:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 