'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';
import { startOfToday, startOfWeek, startOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { databases } = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const timeRange = searchParams.get('timeRange') || 'all';
    const department = searchParams.get('department');
    const fileType = searchParams.get('fileType') || 'all';

    // Build base query
    const queries = [
      Query.equal('status', ['active']),
      Query.orderDesc('updatedAt'),
      Query.limit(100)
    ];

    // Add time filter
    const now = new Date();
    if (timeRange === 'today') {
      queries.push(Query.greaterThanEqual('createdAt', startOfToday().toISOString()));
    } else if (timeRange === 'week') {
      queries.push(Query.greaterThanEqual('createdAt', startOfWeek(now).toISOString()));
    } else if (timeRange === 'month') {
      queries.push(Query.greaterThanEqual('createdAt', startOfMonth(now).toISOString()));
    }

    // Add department filter
    if (department) {
      queries.push(Query.equal('departmentId', [department]));
    }

    // Add file type filter
    if (fileType !== 'all') {
      if (fileType === 'documents') {
        queries.push(Query.search('type', 'document'));
      } else if (fileType === 'images') {
        queries.push(Query.search('type', 'image'));
      } else if (fileType === 'spreadsheets') {
        queries.push(Query.or([
          Query.search('type', 'excel'),
          Query.search('type', 'sheet'),
          Query.search('type', 'csv')
        ]));
      } else if (fileType === 'pdfs') {
        queries.push(Query.search('type', 'pdf'));
      }
    }

    // Add search filter
    if (search) {
      queries.push(Query.search('name', search));
    }

    // First get files owned by user
    const ownedFilesQuery = [...queries, Query.equal('ownerId', [currentUser.$id])];
    const ownedFiles = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      ownedFilesQuery
    );

    // Then get files shared with user
    const sharedFilesQuery = [...queries, Query.contains('sharedWith', [currentUser.$id])];
    const sharedFiles = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      sharedFilesQuery
    );

    // Get files from user's department
    const departmentFilesQuery = [...queries];
    if (currentUser.department) {
      // Ensure department is a valid string ID before using it in a query
      const departmentId = typeof currentUser.department === 'string' 
        ? currentUser.department 
        : (currentUser.department.$id || currentUser.department.id || null);
      
      if (departmentId) {
        departmentFilesQuery.push(Query.equal('departmentId', [departmentId]));
        // Exclude files already owned by user
        departmentFilesQuery.push(Query.notEqual('ownerId', [currentUser.$id]));
      }
    }
    
    const departmentFiles = currentUser.department 
      ? await databases.listDocuments(
          fullConfig.databaseId,
          fullConfig.filesCollectionId,
          departmentFilesQuery
        )
      : { documents: [] };

    // Combine and format results
    const allFiles = [...ownedFiles.documents, ...sharedFiles.documents, ...departmentFiles.documents];
    
    // Remove duplicates (might happen if a file is both owned and shared)
    const uniqueFiles = Array.from(new Map(allFiles.map(file => [file.$id, file])).values());
    
    // Sort by lastViewed (if available) or updatedAt
    uniqueFiles.sort((a, b) => {
      const dateA = a.lastViewed ? new Date(a.lastViewed) : new Date(a.updatedAt);
      const dateB = b.lastViewed ? new Date(b.lastViewed) : new Date(b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Get owner details and format response
    const formattedFiles = await Promise.all(uniqueFiles.map(async (file) => {
      // Get owner details
      let owner = null;
      try {
        owner = await databases.getDocument(
          fullConfig.databaseId,
          fullConfig.usersCollectionId,
          file.ownerId
        );
      } catch (error) {
        console.error(`Could not get owner for file ${file.$id}:`, error);
      }
      
      // Get department details
      let department = null;
      if (file.departmentId) {
        try {
          department = await databases.getDocument(
            fullConfig.databaseId,
            fullConfig.departmentsCollectionId,
            file.departmentId
          );
        } catch (error) {
          console.error(`Could not get department for file ${file.$id}:`, error);
        }
      }
      
      // Determine if this file was shared with the user and by whom
      let sharedBy = null;
      if (file.ownerId !== currentUser.$id && file.shareData && Array.isArray(file.shareData)) {
        // Find the share entry that shared this file with the current user
        const shareEntry = file.shareData.find(share => 
          share.sharedWith === currentUser.$id || 
          share.sharedWith === currentUser.department
        );
        
        if (shareEntry) {
          try {
            const sharer = await databases.getDocument(
              fullConfig.databaseId,
              fullConfig.usersCollectionId,
              shareEntry.sharedBy
            );
            
            sharedBy = {
              id: sharer.$id,
              name: sharer.fullName,
              email: sharer.email,
              date: shareEntry.sharedAt
            };
          } catch (error) {
            console.error(`Could not get sharer details for file ${file.$id}:`, error);
          }
        }
      }
      
      return {
        id: file.$id,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size || 0,
        url: file.url,
        status: file.status || 'active',
        owner: owner ? {
          id: owner.$id,
          name: owner.fullName,
          email: owner.email
        } : null,
        sharedBy: sharedBy,
        department: department ? {
          id: department.$id,
          name: department.name
        } : null,
        departmentId: file.departmentId,
        shared: Array.isArray(file.sharedWith) && file.sharedWith.length > 0,
        sharedWith: file.sharedWith || [],
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        lastViewed: file.lastViewed
      };
    }));

    return NextResponse.json({
      files: formattedFiles.slice(0, 50), // Ensure we don't exceed 50 files
      currentUserId: currentUser.$id,
      total: formattedFiles.length
    });
  } catch (error) {
    console.error('Error fetching recent files:', error);
    return NextResponse.json(
      { message: 'Failed to fetch recent files', error: String(error) },
      { status: 500 }
    );
  }
} 