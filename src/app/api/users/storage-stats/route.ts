'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';

const FILE_TYPES = {
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  spreadsheet: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  other: []
};

export async function GET(request: NextRequest) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { databases } = await createAdminClient();
    
    // Get all user files from Appwrite
    const userFiles = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [
        Query.equal('ownerId', [currentUser.$id]),
        Query.equal('status', ['active'])
      ]
    );
    
    // Calculate statistics
    let totalSize = 0;
    let documentSize = 0;
    let imageSize = 0;
    let spreadsheetSize = 0;
    let otherSize = 0;
    
    for (const file of userFiles.documents) {
      const size = file.size || 0;
      totalSize += size;
      
      // Categorize by file type
      if (file.type === 'document') {
        documentSize += size;
      } else if (file.type === 'image') {
        imageSize += size;
      } else if (file.extension === 'xls' || file.extension === 'xlsx') {
        spreadsheetSize += size;
      } else {
        otherSize += size;
      }
    }
    
    const totalGB = 20; // 20GB total storage limit
    const usedGB = bytesToGB(totalSize);
    
    const stats = {
      totalStorage: totalGB,
      usedStorage: usedGB,
      available: totalGB - usedGB,
      fileTypes: {
        document: bytesToGB(documentSize),
        image: bytesToGB(imageSize),
        spreadsheet: bytesToGB(spreadsheetSize),
        other: bytesToGB(otherSize),
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    return NextResponse.json(
      { message: 'Failed to fetch storage stats' },
      { status: 500 }
    );
  }
}

// Convert bytes to GB
function bytesToGB(bytes: number) {
  return bytes / (1024 * 1024 * 1024);
} 