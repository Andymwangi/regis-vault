import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check admin role
    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Requires admin access' },
        { status: 403 }
      );
    }
    
    // Get the Appwrite client
    const { databases } = await createAdminClient();
    
    // Get files
    const filesResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [Query.equal('status', ['active'])]
    );
    
    // Count occurrences of each file type
    const fileTypesMap: Record<string, number> = {};
    let totalSize: Record<string, number> = {};
    
    filesResult.documents.forEach(file => {
      const fileType = file.type || 'other';
      
      // Count files by type
      if (!fileTypesMap[fileType]) {
        fileTypesMap[fileType] = 0;
      }
      fileTypesMap[fileType]++;
      
      // Sum size by type
      if (!totalSize[fileType]) {
        totalSize[fileType] = 0;
      }
      totalSize[fileType] += (file.size || 0);
    });
    
    // Convert to array format with additional stats - formatted as needed by the PieChart
    const distribution = Object.entries(fileTypesMap).map(([type, count]) => ({
      type,
      count,
      totalSize: totalSize[type]
    }));
    
    // Return file types with stats in the format expected by the frontend
    return NextResponse.json({
      distribution,
      totalFiles: filesResult.total
    });
  } catch (error) {
    console.error('Error fetching file types:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}