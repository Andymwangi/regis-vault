'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { checkUserPermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and has admin permissions
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Make sure to use the correct ID property from the currentUser object
    const isAdmin = await checkUserPermission(currentUser.$id, 'admin');
    if (!isAdmin) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const deletedBy = searchParams.get('deletedBy') || '';
    const timeRange = searchParams.get('timeRange') || '';
    const fileType = searchParams.get('fileType') || '';
    
    // Create Appwrite admin client
    const { databases } = await createAdminClient();
    
    // Build base query - only get deleted files
    const queries = [
      Query.equal('status', ['deleted'])
    ];
    
    // Add search query if provided
    if (search) {
      queries.push(Query.search('name', search));
    }
    
    // Add department filter if provided
    if (department) {
      queries.push(Query.equal('departmentId', [department]));
    }
    
    // Add deleted by filter if provided
    if (deletedBy) {
      queries.push(Query.equal('deletedBy', [deletedBy]));
    }
    
    // Add time range filter if provided - based on updatedAt since we don't have deletedAt
    if (timeRange) {
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
    
    // Order by updated date, most recent first (assuming updatedAt is when file was deleted)
    queries.push(Query.orderDesc('updatedAt'));
    
    // Fetch deleted files - as admin we fetch all deleted files in the system
    const files = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      queries
    );
    
    // Gather all user IDs from the files (owner and deleted by)
    const userIds = new Set<string>();
    const departmentIds = new Set<string>();
    
    files.documents.forEach(file => {
      if (file.ownerId) userIds.add(file.ownerId);
      if (file.deletedBy) userIds.add(file.deletedBy);
      if (file.departmentId) departmentIds.add(file.departmentId);
    });
    
    // Fetch user details in batch
    const usersQuery = Array.from(userIds).map(id => Query.equal('$id', [id]));
    const userDocs = usersQuery.length > 1 
      ? await databases.listDocuments(
          fullConfig.databaseId,
          fullConfig.usersCollectionId,
          [Query.or(usersQuery)]
        ) 
      : usersQuery.length === 1
        ? await databases.listDocuments(
            fullConfig.databaseId,
            fullConfig.usersCollectionId,
            [usersQuery[0]]
          )
        : { documents: [] };
    
    // Create a map of user IDs to user objects
    const usersMap = new Map();
    userDocs.documents.forEach(user => {
      usersMap.set(user.$id, user);
    });
    
    // Fetch department details in batch
    const departmentsQuery = Array.from(departmentIds).map(id => Query.equal('$id', [id]));
    const departmentDocs = departmentsQuery.length > 0
      ? await databases.listDocuments(
          fullConfig.databaseId,
          fullConfig.departmentsCollectionId,
          departmentsQuery.length > 1 ? [Query.or(departmentsQuery)] : [departmentsQuery[0]]
        )
      : { documents: [] };
    
    // Also fetch all departments to ensure we have user departments too
    const allDepartments = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId
    );
    
    // Create a map of department IDs to department objects
    const departmentsMap = new Map();
    departmentDocs.documents.forEach(dept => {
      departmentsMap.set(dept.$id, dept);
    });
    
    // Add any missing departments from the all departments list
    allDepartments.documents.forEach(dept => {
      if (!departmentsMap.has(dept.$id)) {
        departmentsMap.set(dept.$id, dept);
      }
    });
    
    // Additional user department map - to handle user's department
    const userDepartmentMap = new Map();
    userDocs.documents.forEach(user => {
      if (user.department) {
        userDepartmentMap.set(user.$id, user.department);
      }
    });
    
    // Enrich file objects with user and department information
    const enrichedFiles = files.documents.map(file => {
      const owner = file.ownerId ? usersMap.get(file.ownerId) : null;
      let deletedByUser = file.deletedBy ? usersMap.get(file.deletedBy) : null;
      const fileDepartment = file.departmentId ? departmentsMap.get(file.departmentId) : null;
      
      // Track the user who deleted the file - if deletedBy is missing, use the owner
      // This is a fallback for files where deletedBy wasn't properly set
      if (!file.deletedBy && file.ownerId) {
        console.log('Using owner as deletedBy (fallback):', file.ownerId);
        file.deletedBy = file.ownerId;
        // Also update the deletedByUser variable to use the owner
        deletedByUser = usersMap.get(file.ownerId);
      } else if (!file.deletedBy) {
        console.log('No deletedBy or owner ID available for file:', file.name);
      }
      
      // Get deletedBy user's department if available
      let deletedByUserDepartment = null;
      if (deletedByUser && userDepartmentMap.has(deletedByUser.$id)) {
        const deptId = userDepartmentMap.get(deletedByUser.$id);
        deletedByUserDepartment = departmentsMap.get(deptId);
      }
      
      return {
        ...file,
        owner: owner ? {
          id: owner.$id,
          name: owner.name || owner.fullName,
          email: owner.email,
          department: owner.department ? departmentsMap.get(owner.department) : null
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
        deletedAt: file.updatedAt // Use updatedAt as the deletedAt timestamp
      };
    });
    
    return NextResponse.json({
      files: enrichedFiles,
      total: files.total
    });
  } catch (error) {
    console.error('Error fetching admin trashed files:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 