'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';

export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department');

    // Get files shared with the current user
    const filesQuery = [
      Query.contains('sharedWith', currentUser.$id),
      Query.equal('status', ['active'])
    ];
    
    console.log('Querying for files shared with user:', currentUser.$id);
    console.log('Query parameters:', filesQuery);

    // Add department filter if provided
    if (department) {
      filesQuery.push(Query.equal('departmentId', [department]));
    }

    // No direct way to filter by name in the same query, so we'll filter later
    const sharedFiles = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      filesQuery
    );

    // Filter by search term if provided
    let results = sharedFiles.documents;
    if (search) {
      results = results.filter(file => 
        file.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Fetch owner details for each file
    const detailedResults = await Promise.all(
      results.map(async file => {
        const owner = await databases.getDocument(
          fullConfig.databaseId,
          fullConfig.usersCollectionId,
          file.ownerId
        ).catch(() => null);

        // Get department if available
        let departmentData = null;
        if (file.departmentId) {
          departmentData = await databases.getDocument(
            fullConfig.databaseId,
            'departments',
            file.departmentId
          ).catch(() => null);
        }

        return {
          id: file.$id,
          name: file.name,
          type: file.type,
          size: file.size,
          url: file.url,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          owner: owner ? {
            id: owner.$id,
            name: owner.fullName,
            email: owner.email
          } : null,
          department: departmentData ? {
            id: departmentData.$id,
            name: departmentData.name
          } : null
        };
      })
    );

    return NextResponse.json(detailedResults);
  } catch (error) {
    console.error('Error fetching shared files:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 