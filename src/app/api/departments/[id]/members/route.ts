'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    const departmentId = params.id;

    // Get users in this department
    const departmentMembers = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [
        Query.equal('department', [departmentId]),
        Query.orderAsc('fullName')
      ]
    );

    // Format the results
    const members = departmentMembers.documents.map(user => ({
      id: user.$id,
      name: user.fullName,
      email: user.email,
      role: user.role
    }));

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching department members:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 