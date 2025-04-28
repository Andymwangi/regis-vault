'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { account, fullConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting trash API request');
    
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.log('Unauthorized: User not authenticated');
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    console.log(`User authenticated: ${currentUser.$id}, role: ${currentUser.role || 'unknown'}`);
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const deletedBy = searchParams.get('deletedBy') || '';
    const timeRange = searchParams.get('timeRange') || '';
    const fileType = searchParams.get('fileType') || '';
    
    console.log('Request parameters:', { search, department, deletedBy, timeRange, fileType });
    
    // Create Appwrite admin client
    const { databases } = await createAdminClient();
    
    // Build base query - only get deleted files
    const queries = [
      Query.equal('status', ['deleted'])
    ];
    console.log('Base query: status = deleted');
    
    // Add search query if provided
    if (search) {
      queries.push(Query.search('name', search));
    }
    
    // Add department filter if provided
    if (department && department !== 'all') {
      queries.push(Query.equal('departmentId', [department]));
    }
    
    // Add deleted by filter if provided
    if (deletedBy && deletedBy !== 'all') {
      queries.push(Query.equal('deletedBy', [deletedBy]));
    }
    
    // Add time range filter if provided - based on updatedAt since we don't have deletedAt
    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      let cutoffDate;
      
      switch (timeRange) {
        case 'today':
          cutoffDate = new Date(now);
          cutoffDate.setHours(0, 0, 0, 0);
          break;
          
        case 'week':
          cutoffDate = new Date(now);
          cutoffDate.setDate(now.getDate() - 7);
          break;
          
        case 'month':
          cutoffDate = new Date(now);
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
          
        default:
          cutoffDate = null;
      }
      
      if (cutoffDate) {
        queries.push(Query.greaterThanEqual('updatedAt', [cutoffDate.toISOString()]));
      }
    }
    
    // Add file type filter if provided
    if (fileType && fileType !== 'all') {
      queries.push(Query.search('type', fileType));
    }

    // Log the final query
    console.log('Final query:', JSON.stringify(queries));
    
    // Fetch deleted files
    console.log('Executing query to fetch deleted files');
    try {
      const files = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        queries
      );
      
      console.log(`Query returned ${files.total} deleted files`);
      console.log('First few file IDs:', files.documents.slice(0, 3).map(doc => doc.$id));
      
      // Gather all user IDs from the files (owner and deleted by)
      const userIds = new Set<string>();
      const departmentIds = new Set<string>();
      
      files.documents.forEach(file => {
        if (file.ownerId) userIds.add(file.ownerId);
        if (file.deletedBy) userIds.add(file.deletedBy);
        if (file.departmentId) departmentIds.add(file.departmentId);
      });
      
      console.log(`Found ${userIds.size} unique user IDs and ${departmentIds.size} department IDs`);
      
      // Fetch user details in batch
      const usersQuery = Array.from(userIds).map(id => Query.equal('$id', [id]));
      const userDocs = usersQuery.length > 0 
        ? await databases.listDocuments(
            fullConfig.databaseId,
            fullConfig.usersCollectionId,
            usersQuery.length > 1 ? [Query.or(usersQuery)] : [usersQuery[0]]
          ) 
        : { documents: [] };
      
      console.log(`Retrieved ${userDocs.documents.length} user documents`);
      
      // Create a map of user IDs to user objects
      const usersMap = new Map();
      userDocs.documents.forEach(user => {
        usersMap.set(user.$id, user);
        // Add department ID to departmentIds if user has a department
        if (user.departmentId) {
          departmentIds.add(user.departmentId);
        }
      });
      
      // Fetch ALL departments to ensure we have them all
      const departmentDocs = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.departmentsCollectionId,
        []
      );
      
      console.log(`Retrieved ${departmentDocs.documents.length} department documents`);
      
      // Create a map of department IDs to department objects
      const departmentsMap = new Map();
      departmentDocs.documents.forEach(dept => {
        departmentsMap.set(dept.$id, dept);
      });
      
      // Process each file to add owner and department information
      const enrichedFiles = files.documents.map(file => {
        const owner = file.ownerId ? usersMap.get(file.ownerId) : null;
        const deletedByUser = file.deletedBy ? usersMap.get(file.deletedBy) : null;
        const fileDepartment = file.departmentId ? departmentsMap.get(file.departmentId) : null;
        
        // Get the department of the user who deleted the file
        let deletedByUserDepartment = null;
        if (deletedByUser) {
          // Try different possible field names for department
          const deptId = deletedByUser.departmentId || deletedByUser.department;
          if (deptId && departmentsMap.has(deptId)) {
            deletedByUserDepartment = departmentsMap.get(deptId);
            console.log(`Found department for user ${deletedByUser.$id}: ${deletedByUserDepartment.name}`);
          } else {
            console.log(`No department found for user ${deletedByUser.$id}`);
          }
        }
        
        // Create the enriched file object
        const enrichedFile = {
          ...file,
          id: file.$id, // Add id field that matches the DeletedFile interface
          owner: owner ? {
            id: owner.$id,
            name: owner.name || owner.fullName,
            email: owner.email,
            department: owner.departmentId ? departmentsMap.get(owner.departmentId) : null
          } : null,
          deletedBy: deletedByUser ? {
            id: deletedByUser.$id,
            name: deletedByUser.name || deletedByUser.fullName,
            email: deletedByUser.email,
            department: deletedByUserDepartment ? {
              id: deletedByUserDepartment.$id,
              name: deletedByUserDepartment.name
            } : null
          } : null,
          department: fileDepartment ? {
            id: fileDepartment.$id,
            name: fileDepartment.name
          } : null,
          deletedAt: file.deletedAt || file.updatedAt // Use deletedAt if available, otherwise fallback to updatedAt
        };
        
        // Log debug info for department display issue
        if (deletedByUser) {
          console.log(`User ${deletedByUser.$id} department info:`, {
            departmentId: deletedByUser.departmentId || deletedByUser.department || 'none',
            departmentFound: !!deletedByUserDepartment,
            departmentName: deletedByUserDepartment?.name || 'N/A'
          });
        }
        
        return enrichedFile;
      });
      
      return NextResponse.json({
        files: enrichedFiles,
        total: files.total
      });
    } catch (dbError) {
      console.error('Database error in trash API:', dbError);
      console.error('Error details:', JSON.stringify(dbError));
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching trash files:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 