'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'appwrite';
import { account, databases, storage, DATABASES, COLLECTIONS, STORAGE_BUCKETS, sanitizeUserId } from '@/lib/appwrite/config';
import { db } from '@/lib/db';
import { files, sharedFiles } from '@/server/db/schema/schema';
import { eq, or } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
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

    // Check if user has access to the file from Postgres (for file metadata)
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

    // Get the file from Appwrite storage
    try {
      // We need to look up the Appwrite file ID from metadata as it's not in the Postgres schema
      const appwriteFileId = await getAppwriteFileIdFromMetadata(fileId);
      
      if (!appwriteFileId) {
        return NextResponse.json({ message: 'File not found in storage' }, { status: 404 });
      }
      
      // Get file download URL from Appwrite
      const fileDownload = storage.getFileDownload(STORAGE_BUCKETS.FILES, appwriteFileId);
      
      // Redirect to the download URL
      return NextResponse.redirect(fileDownload);
    } catch (storageError) {
      // Fallback to local file system if Appwrite storage fails
      console.error('Error accessing Appwrite storage, falling back to local:', storageError);
      
      // Read the file from disk (legacy path)
      const filePath = join(process.cwd(), 'public', file.url);
      const fileBuffer = await readFile(filePath);
      
      // Return the file with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': file.type,
          'Content-Disposition': `attachment; filename="${file.name}"`,
        },
      });
    }
  } catch (error) {
    console.error('Error downloading file:', error);
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