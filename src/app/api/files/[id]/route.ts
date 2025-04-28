'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'appwrite';
import { account, databases, storage, fullConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { ID } from 'node-appwrite';

// Helper function to sanitize user ID
const sanitizeUserId = (id: string) => id.replace(/\./g, '_');

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Important: First perform a truly asynchronous operation
    const currentUser = await getCurrentUser();
    
    // Now it's safe to use params
    const fileId = params.id;
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { databases, storage } = await createAdminClient();
    
    // Get the file
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if user has permission to delete the file
    if (file.ownerId !== currentUser.$id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete from storage
    await storage.deleteFile(fullConfig.storageId, file.bucketFileId);

    // Delete from database
    await databases.deleteDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );

    // Log the delete activity
    try {
      await databases.createDocument(
        fullConfig.databaseId,
        fullConfig.activityLogsCollectionId,
        ID.unique(),
        {
          userId: currentUser.$id,
          type: 'DELETE_FILE',
          description: `Deleted file: ${file.name}`,
          createdAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to log activity:', error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // First perform a truly asynchronous operation
    const currentUser = await getCurrentUser();

    // Now it's safe to use params
    const fileId = params.id;
    console.log('File details API called for:', fileId);
    
    if (!currentUser) {
      console.error('Unauthorized file details request');
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('User authenticated:', currentUser.$id);
    
    // Create a fresh admin client
    const { databases } = await createAdminClient();
    
    // Get the file document
    console.log('Fetching file document from database...');
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    if (!file) {
      console.error('File document not found');
      return NextResponse.json(
        { message: 'File not found' },
        { status: 404 }
      );
    }
    
    console.log('File document found:', file.$id);
    
    // Check if user has access to the file
    const hasAccess = 
      file.ownerId === currentUser.$id || 
      (file.sharedWith && file.sharedWith?.includes(currentUser.$id)) ||
      currentUser.role === 'admin';
    
    if (!hasAccess) {
      console.error('Access denied. User is not the owner, shared with, or is not an admin.');
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Return safe file data
    return NextResponse.json({
      id: file.$id,
      name: file.name,
      type: file.type,
      extension: file.extension,
      size: file.size,
      bucketFieldId: file.bucketFieldId,
      bucketFileId: file.bucketFileId,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt
    });
    
  } catch (error) {
    console.error('Error retrieving file details:', error);
    return NextResponse.json(
      { 
        error: 'Error retrieving file details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 