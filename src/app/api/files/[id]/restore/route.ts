'use server';

import { NextRequest, NextResponse } from 'next/server';
import { account, databases, storage, fullConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { ID } from 'node-appwrite';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First perform a truly asynchronous operation to avoid bug with params
    const currentUser = await getCurrentUser();
    
    // Now it's safe to use params
    const fileId = params.id;
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    
    // Get the file from the database
    let file;
    try {
      file = await databases.getDocument(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        fileId
      );
    } catch (error) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if the file is in deleted state
    if (file.status !== 'deleted') {
      return NextResponse.json({ error: 'File is not in trash' }, { status: 400 });
    }

    // Check if the user has permission to restore the file
    // Allow admin, file owner, or user from the same department to restore
    const hasPermission = 
      currentUser.role === 'admin' || 
      file.ownerId === currentUser.$id ||
      (file.departmentId && file.departmentId === currentUser.departmentId);
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update the file status to active
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId,
      {
        status: 'active',
        deletedAt: null,
        deletedBy: null
      }
    );

    // Log the restore activity
    try {
      await databases.createDocument(
        fullConfig.databaseId,
        fullConfig.activityLogsCollectionId,
        ID.unique(),
        {
          userId: currentUser.$id,
          type: 'RESTORE_FILE',
          description: `Restored file: ${file.name}`,
          fileId: file.$id,
          createdAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to log activity:', error);
    }

    return NextResponse.json({ 
      success: true,
      message: 'File restored successfully'
    });
  } catch (error) {
    console.error('Error restoring file:', error);
    return NextResponse.json(
      { error: 'Failed to restore file' },
      { status: 500 }
    );
  }
} 