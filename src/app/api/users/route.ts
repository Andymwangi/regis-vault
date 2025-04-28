'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';

/**
 * Get users (limited data for non-admin users)
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

    // Get search query
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('query') || '';

    // Get the Appwrite client
    const { databases } = await createAdminClient();

    // Setup query parameters
    const queries = [Query.limit(100)];
    
    // Add search filter if provided
    if (query) {
      queries.push(Query.search('name', query));
    }

    // Get users
    const users = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      queries
    );
    
    // Get departments for looking up department names
    const departments = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId
    );
    
    // Create a map of department IDs to department objects
    const departmentsMap = new Map();
    departments.documents.forEach(dept => {
      departmentsMap.set(dept.$id, dept);
    });
    
    console.log("Found departments:", departments.documents.length);
    console.log("Users with departments:", users.documents.filter(u => u.department).length);

    // Return users with limited data for privacy/security
    // and include complete department info
    return NextResponse.json({
      success: true,
      users: users.documents.map(user => {
        const departmentObj = user.department && departmentsMap.has(user.department) 
          ? {
              id: departmentsMap.get(user.department).$id,
              name: departmentsMap.get(user.department).name
            }
          : null;
        
        console.log("User:", user.fullName, "Department:", user.department, "Dept Object:", departmentObj);
          
        return {
          id: user.$id,
          name: user.name || user.fullName,
          department: departmentObj
        };
      })
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 