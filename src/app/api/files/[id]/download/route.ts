'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { ID } from 'node-appwrite';
import { constructDownloadUrl } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First perform a truly asynchronous operation
    const currentUser = await getCurrentUser();

    // Now it's safe to use params
    const fileId = params.id;
    console.log('File download API called for:', fileId);
    
    if (!currentUser) {
      console.error('Unauthorized download attempt');
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('User authenticated:', currentUser.$id);
    
    // Create a fresh admin client
    const { databases, storage } = await createAdminClient();
    
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
      file.sharedWith?.includes(currentUser.$id) ||
      currentUser.role === 'admin';
    
    if (!hasAccess) {
      console.error('Access denied. User is not the owner, shared with, or is not an admin.');
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Get the file download URL
    const fileUrl = constructDownloadUrl(file.bucketFieldId);
    
    // Log the download activity
    try {
      await databases.createDocument(
        fullConfig.databaseId,
        fullConfig.activityLogsCollectionId,
        ID.unique(),
        {
          userId: currentUser.$id,
          type: 'DOWNLOAD_FILE',
          description: `Downloaded file: ${file.name}`,
          createdAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
    
    // Redirect to the download URL
    return NextResponse.json({ url: fileUrl });
  } catch (error: any) {
    console.error('Error downloading file:', error);
    console.error('Error details:', error.message, error.code, error.type);
    
    return NextResponse.json(
      { 
        message: 'Failed to download file', 
        error: error.message,
        code: error.code,
        type: error.type
      },
      { status: 500 }
    );
  }
} 