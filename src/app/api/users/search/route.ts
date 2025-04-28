import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Build query conditions
    const queries = [
      Query.equal('status', ['active']),
      Query.limit(10)
    ];
    
    if (query) {
      // Appwrite doesn't support OR between different fields in a single query
      // So we'll do a search on fullName and then filter results
      queries.push(Query.search('fullName', query));
    }

    // Get users from Appwrite
    const usersResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      queries
    );

    // Format the results
    const formattedUsers = usersResult.documents.map(user => ({
      id: user.$id,
      name: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department || 'N/A',
      avatar: user.avatar,
    }));

    // If we're searching by email and didn't find it in the name search, do an additional filter
    if (query && query.includes('@')) {
      const emailUsers = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.usersCollectionId,
        [
          Query.equal('status', ['active']),
          Query.search('email', query),
          Query.limit(10)
        ]
      );
      
      // Add any users found by email that aren't already in the results
      const emailIds = formattedUsers.map(u => u.id);
      const additionalUsers = emailUsers.documents
        .filter(user => !emailIds.includes(user.$id))
        .map(user => ({
          id: user.$id,
          name: user.fullName,
          email: user.email,
          role: user.role,
          department: user.department || 'N/A',
          avatar: user.avatar,
        }));
      
      formattedUsers.push(...additionalUsers);
    }

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { message: 'Failed to search users' },
      { status: 500 }
    );
  }
} 