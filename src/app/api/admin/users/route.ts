'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query, Models } from 'node-appwrite';

/**
 * Get all users with enhanced information
 * @method GET
 */
export async function GET(req: NextRequest) {
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
    
    // Get search and filter parameters
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const departmentFilter = searchParams.get('department');
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');
    
    // Get the Appwrite client
    const { databases } = await createAdminClient();
    
    // First, get all departments to create a mapping
    console.log("Fetching departments...");
    const departmentsResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId
    );
    
    console.log(`Found ${departmentsResult.total} departments`);
    
    // Create a map of department IDs to department names
    const departmentMap: Record<string, string> = {};
    departmentsResult.documents.forEach(dept => {
      // Log the department to debug
      console.log(`Department: ID=${dept.$id}, Name=${dept.name}`);
      departmentMap[dept.$id] = dept.name;
    });
    
    // Setup query parameters for users
    const queries = [Query.limit(100)];
    
    // Add department filter if provided and not 'all'
    if (departmentFilter && departmentFilter !== 'all') {
      queries.push(Query.equal('department', departmentFilter));
    }
    
    // Add role filter if provided and not 'all'
    if (roleFilter && roleFilter !== 'all') {
      queries.push(Query.equal('role', roleFilter));
    }
    
    // Add status filter if provided and not 'all'
    if (statusFilter && statusFilter !== 'all') {
      queries.push(Query.equal('status', statusFilter));
    }
    
    // Get users
    console.log("Fetching users...");
    const usersResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      queries
    );
    
    console.log(`Found ${usersResult.total} users`);
    
    // Filter by search term manually (since we can't use fulltext search)
    let filteredUsers = usersResult.documents;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => {
        const nameMatch = (user.fullName || user.name || '').toLowerCase().includes(searchLower);
        const emailMatch = (user.email || '').toLowerCase().includes(searchLower);
        return nameMatch || emailMatch;
      });
      console.log(`Filtered to ${filteredUsers.length} users based on search "${search}"`);
    }
    
    // Map users to include department names
    const enhancedUsers = filteredUsers.map(user => {
      const departmentId = user.department;
      const departmentName = departmentMap[departmentId] || 'Unknown Department';
      
      // Log user details to debug
      console.log(`User: ID=${user.$id}, Name=${user.fullName || user.name}, Department ID=${departmentId}, Department Name=${departmentName}`);
      
      return {
        id: user.$id,
        name: user.fullName || user.name || 'Unknown User',
        email: user.email,
        department: departmentId,                  // Keep the department ID for reference
        departmentName: departmentName,            // Add the department name
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin || 'Never'
      };
    });
    
    // Return the enhanced users with department names
    return NextResponse.json({
      success: true,
      users: enhancedUsers,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}