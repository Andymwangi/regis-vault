'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query, ID } from 'node-appwrite';

export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin role
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const type = searchParams.get('type');
    const sort = searchParams.get('sort') || 'createdAt';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query
    const queries = [
      Query.equal('status', ['active'])
    ];
    
    // Add department filter
    if (department && department !== 'all') {
      queries.push(Query.equal('departmentId', [department]));
    }

    // Add type filter
    if (type && type !== 'all') {
      queries.push(Query.equal('type', [type]));
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    queries.push(Query.limit(limit));
    queries.push(Query.offset(offset));
    
    // Add sorting
    if (sort === 'name') {
      queries.push(Query.orderDesc('name'));
    } else if (sort === 'size') {
      queries.push(Query.orderDesc('size'));
    } else {
      queries.push(Query.orderDesc('createdAt'));
    }

    // Fetch files
    const filesResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      queries
    );

    // Process files to include owner and department info
    const formattedFiles = await Promise.all(
      filesResult.documents.map(async (file) => {
        // Get owner details
        let uploadedBy = 'Unknown';
        try {
          if (file.ownerId) {
            const user = await databases.getDocument(
              fullConfig.databaseId,
              fullConfig.usersCollectionId,
              file.ownerId
            );
            uploadedBy = user.fullName || 'Unknown';
          }
        } catch (error) {
          // User not found
        }

        // Get department details
        let departmentName = 'N/A';
        try {
          if (file.departmentId) {
            const dept = await databases.getDocument(
              fullConfig.databaseId,
              'departments',
              file.departmentId
            );
            departmentName = dept.name || 'N/A';
          }
        } catch (error) {
          // Department not found
        }

        return {
          id: file.$id,
          name: file.name,
          type: file.type,
          size: file.size,
          url: file.url,
          thumbnailUrl: file.thumbnailUrl,
          status: file.status,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          uploadedBy,
          department: departmentName
        };
      })
    );

    return NextResponse.json({
      files: formattedFiles,
      pagination: {
        total: filesResult.total,
        pages: Math.ceil(filesResult.total / limit),
        current: page
      }
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    // Here you would typically:
    // 1. Validate file types and sizes
    // 2. Upload files to storage (e.g., Appwrite Storage)
    // 3. Save file metadata to Appwrite database

    return NextResponse.json({ 
      message: 'Files uploaded successfully',
      count: files.length 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin role
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    const { fileIds } = await request.json();
    
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: fileIds array is required' },
        { status: 400 }
      );
    }

    // First get files to delete for response
    const filesToDelete = [];
    
    // Update files to deleted status
    for (const fileId of fileIds) {
      try {
        // Get file info first
        const file = await databases.getDocument(
          fullConfig.databaseId,
          fullConfig.filesCollectionId,
          fileId
        );
        
        filesToDelete.push({
          id: file.$id,
          name: file.name
        });
        
        // Update status to deleted
        await databases.updateDocument(
          fullConfig.databaseId,
          fullConfig.filesCollectionId,
          fileId,
          {
            status: 'deleted',
            updatedAt: new Date().toISOString()
          }
        );
        
        // Log the activity
        await databases.createDocument(
          fullConfig.databaseId,
          fullConfig.activityLogsCollectionId,
          ID.unique(),
          {
            action: 'DELETE_FILES',
            description: `Admin deleted file: ${file.name}`,
            userId: currentUser.$id,
            createdAt: new Date().toISOString()
          }
        );
      } catch (error) {
        console.error(`Error deleting file ${fileId}:`, error);
      }
    }

    return NextResponse.json({ 
      message: 'Files deleted successfully',
      deletedCount: filesToDelete.length 
    });
  } catch (error) {
    console.error('Error deleting files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete files' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin role
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    const { fileId, status } = await request.json();
    
    if (!fileId || typeof status !== 'string' || !['active', 'inactive'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request: fileId and valid status are required' },
        { status: 400 }
      );
    }

    try {
      // Get file info first
      const file = await databases.getDocument(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        fileId
      );
      
      // Update file status
      const updatedFile = await databases.updateDocument(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        fileId,
        {
          status,
          updatedAt: new Date().toISOString()
        }
      );
      
      // Log the activity
      await databases.createDocument(
        fullConfig.databaseId,
        'activity_logs',
        ID.unique(),
        {
          action: 'UPDATE_FILE_ACCESS',
          description: `Admin updated file ${file.name} (${fileId}) status to ${status}`,
          userId: currentUser.$id,
          createdAt: new Date().toISOString()
        }
      );
      
      return NextResponse.json({ 
        message: 'File access updated successfully',
        file: updatedFile
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'File not found or could not be updated' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error updating file access:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update file access' },
      { status: 500 }
    );
  }
}

// Helper function to get available departments
export async function getDepartments() {
  try {
    const { databases } = await createAdminClient();
    
    const departments = await databases.listDocuments(
      fullConfig.databaseId,
      'departments',
      [Query.orderAsc('name')]
    );
    
    return departments.documents.map(dept => ({
      id: dept.$id,
      name: dept.name
    }));
  } catch (error) {
    console.error('Error getting departments:', error);
    return [];
  }
} 