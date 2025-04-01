'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'appwrite';
import { account, databases, storage, DATABASES, COLLECTIONS, STORAGE_BUCKETS, sanitizeUserId } from '@/lib/appwrite/config';
import { db } from '@/lib/db';
import { files, sharedFiles } from '@/server/db/schema/schema';
import { eq, or } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the current user using Appwrite
    const currentUser = await account.get();
    
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user profile data
    const userProfiles = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.DEPARTMENTS,
      [
        Query.equal('userId', sanitizeUserId(currentUser.$id))
      ]
    );
    
    if (userProfiles.documents.length === 0) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }
    
    const userProfile = userProfiles.documents[0];
    const fileId = params.id;

    // Check if user has access to the file
    const file = await db.query.files.findFirst({
      where: or(
        eq(files.id, fileId),
        eq(sharedFiles.fileId, fileId)
      ),
      with: {
        shares: true
      }
    });

    if (!file) {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }

    // Check if user owns the file or has been shared with them
    const hasAccess = file.userId === currentUser.$id || 
                     file.shares.some((share: { sharedWithUserId: string }) => 
                       share.sharedWithUserId === currentUser.$id
                     );

    if (!hasAccess) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    // Try to delete the file from Appwrite storage if it exists there
    try {
      // Get Appwrite file ID from metadata
      const appwriteFileId = await getAppwriteFileIdFromMetadata(fileId);
      
      if (appwriteFileId) {
        // Delete from Appwrite storage
        await storage.deleteFile(STORAGE_BUCKETS.FILES, appwriteFileId);
        
        // Delete metadata from Appwrite database
        const filesMetadata = await databases.listDocuments(
          DATABASES.MAIN,
          COLLECTIONS.FILES_METADATA,
          [
            Query.equal('postgres_file_id', fileId)
          ]
        );
        
        if (filesMetadata.documents.length > 0) {
          await databases.deleteDocument(
            DATABASES.MAIN,
            COLLECTIONS.FILES_METADATA,
            filesMetadata.documents[0].$id
          );
        }
      }
    } catch (storageError) {
      console.error('Error deleting from Appwrite storage:', storageError);
      // Continue with local file deletion even if Appwrite deletion fails
    }

    // Fallback: Delete the file from local disk if it exists
    try {
      const filePath = join(process.cwd(), 'public', file.url);
      await unlink(filePath);
    } catch (fsError) {
      console.error('Error deleting local file:', fsError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete the file record from database
    await db.delete(files).where(eq(files.id, fileId));

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to find Appwrite file ID from metadata
async function getAppwriteFileIdFromMetadata(postgresFileId: string) {
  try {
    // Query the Appwrite files_metadata collection to find the file
    const filesMetadata = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.FILES_METADATA,
      [
        Query.equal('postgres_file_id', postgresFileId)
      ]
    );
    
    if (filesMetadata.documents.length > 0) {
      return filesMetadata.documents[0].file_id; // Return the Appwrite storage file ID
    }
    
    return null;
  } catch (error) {
    console.error('Error getting Appwrite file ID from metadata:', error);
    return null;
  }
} 