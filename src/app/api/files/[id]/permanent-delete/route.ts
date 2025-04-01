'use server';

import { NextResponse } from 'next/server';
import { Query } from 'appwrite';
import { account, databases, storage, DATABASES, COLLECTIONS, STORAGE_BUCKETS, sanitizeUserId } from '@/lib/appwrite/config';
import { db } from '@/lib/db';
import { files } from '@/server/db/schema/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the current user using Appwrite
    const currentUser = await account.get();
    
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user profile data to check role
    const userProfiles = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.DEPARTMENTS,
      [
        Query.equal('userId', sanitizeUserId(currentUser.$id))
      ]
    );
    
    if (userProfiles.documents.length === 0 || 
        userProfiles.documents[0].role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const fileId = params.id;

    // Get Appwrite file ID from metadata and delete from storage if it exists
    try {
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
      // Continue with database deletion even if Appwrite deletion fails
    }

    // Delete from PostgreSQL database
    await db.delete(files).where(eq(files.id, fileId));

    return NextResponse.json({ message: 'File permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting file:', error);
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