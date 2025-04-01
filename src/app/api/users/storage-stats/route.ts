'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'appwrite';
import { account, databases, DATABASES, COLLECTIONS, sanitizeUserId } from '@/lib/appwrite/config';
import { db } from '@/lib/db';
import { files } from '@/server/db/schema/schema';
import { eq, and, sql } from 'drizzle-orm';

const FILE_TYPES = {
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  spreadsheet: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  other: []
};

export async function GET(request: NextRequest) {
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

    // Get total size of all files
    const totalSize = await db
      .select({ 
        size: sql<number>`sum(${files.size})` 
      })
      .from(files)
      .where(
        and(
          eq(files.userId, currentUser.$id),
          eq(files.status, 'active')
        )
      );

    // Get sizes by file types using the helper function
    const documentSize = await getFileSizeByTypes(currentUser.$id, FILE_TYPES.document);
    const imageSize = await getFileSizeByTypes(currentUser.$id, FILE_TYPES.image);
    const spreadsheetSize = await getFileSizeByTypes(currentUser.$id, FILE_TYPES.spreadsheet);
    const otherSize = await getFileSizeByTypes(currentUser.$id, FILE_TYPES.other, true);

    const totalGB = 20; // 20GB total storage limit
    const usedBytes = totalSize[0]?.size || 0;
    const usedGB = bytesToGB(usedBytes);

    // Also get statistics from Appwrite storage for files not yet in Postgres
    let appwriteStats = {
      totalSize: 0,
      document: 0,
      image: 0,
      spreadsheet: 0,
      other: 0
    };
    
    try {
      // Get the user's files from Appwrite
      const appwriteFiles = await databases.listDocuments(
        DATABASES.MAIN,
        COLLECTIONS.FILES_METADATA,
        [
          Query.equal('user_id', currentUser.$id)
        ]
      );
      
      // Calculate statistics
      for (const file of appwriteFiles.documents) {
        appwriteStats.totalSize += file.file_size || 0;
        
        if (FILE_TYPES.document.includes(file.file_type)) {
          appwriteStats.document += file.file_size || 0;
        } else if (FILE_TYPES.image.includes(file.file_type)) {
          appwriteStats.image += file.file_size || 0;
        } else if (FILE_TYPES.spreadsheet.includes(file.file_type)) {
          appwriteStats.spreadsheet += file.file_size || 0;
        } else {
          appwriteStats.other += file.file_size || 0;
        }
      }
    } catch (error) {
      console.error('Error fetching Appwrite storage stats:', error);
      // Continue even if Appwrite stats fail
    }

    // Combine Postgres and Appwrite stats
    const combinedStats = {
      totalStorage: totalGB,
      usedStorage: usedGB + bytesToGB(appwriteStats.totalSize),
      available: totalGB - (usedGB + bytesToGB(appwriteStats.totalSize)),
      fileTypes: {
        document: bytesToGB(documentSize + appwriteStats.document),
        image: bytesToGB(imageSize + appwriteStats.image),
        spreadsheet: bytesToGB(spreadsheetSize + appwriteStats.spreadsheet),
        other: bytesToGB(otherSize + appwriteStats.other),
      },
    };

    return NextResponse.json(combinedStats);
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    return NextResponse.json(
      { message: 'Failed to fetch storage stats' },
      { status: 500 }
    );
  }
}

// Helper function to get file size by types
async function getFileSizeByTypes(userId: string, types: string[], isOther = false) {
  const query = db
    .select({ 
      size: sql<number>`sum(${files.size})` 
    })
    .from(files)
    .where(
      and(
        eq(files.userId, userId),
        eq(files.status, 'active'),
        isOther 
          ? sql`${files.type} NOT IN (${FILE_TYPES.document.concat(FILE_TYPES.image, FILE_TYPES.spreadsheet)})`
          : sql`${files.type} IN (${types})`
      )
    );

  const result = await query;
  return result[0]?.size || 0;
}

// Convert bytes to GB
function bytesToGB(bytes: number) {
  return bytes / (1024 * 1024 * 1024);
} 