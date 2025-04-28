'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { Query, ID } from 'node-appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Create Appwrite admin client
    const { databases } = await createAdminClient();
    
    // Get total files count
    const totalFiles = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [
        Query.equal('ownerId', [currentUser.$id]),
        Query.limit(1)
      ]
    );
    
    // Get recent uploads
    const recentUploads = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [
        Query.equal('ownerId', [currentUser.$id]),
        Query.orderDesc('$createdAt'),
        Query.limit(5)
      ]
    );
    
    // Get shared files (files where current user is in sharedWith array)
    const sharedFiles = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [
        Query.search('sharedWith', currentUser.$id),
        Query.limit(1)
      ]
    );
    
    // Get recently viewed files
    const recentlyViewed = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.activityLogsCollectionId,
      [
        Query.equal('userId', [currentUser.$id]),
        Query.equal('type', ['VIEW_FILE']),
        Query.orderDesc('$createdAt'),
        Query.limit(5)
      ]
    );
    
    return NextResponse.json({
      totalFiles: totalFiles.total,
      recentUploads: recentUploads.documents,
      sharedFiles: sharedFiles.total,
      recentlyViewed: recentlyViewed.documents
    });
  } catch (error) {
    console.error('Error fetching file stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file stats' },
      { status: 500 }
    );
  }
} 