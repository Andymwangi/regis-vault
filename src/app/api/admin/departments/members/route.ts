import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { addUserToDepartment, removeUserFromDepartment } from '@/lib/appwrite/department-operations';

/**
 * Update department members
 * @method PUT
 */
export async function PUT(req: NextRequest) {
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

    // Parse request body
    const { departmentId, members } = await req.json();

    if (!departmentId) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(members)) {
      return NextResponse.json(
        { error: 'Members must be an array' },
        { status: 400 }
      );
    }

    // Get the Appwrite client
    const { databases } = await createAdminClient();

    // Get current department data
    const department = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      departmentId
    );

    // Get current members
    const currentMembers = department.members || [];

    // Determine which users to add and which to remove
    const membersToAdd = members.filter((id: string) => !currentMembers.includes(id));
    const membersToRemove = currentMembers.filter((id: string) => !members.includes(id));

    // Add new members
    for (const userId of membersToAdd) {
      await addUserToDepartment(userId, departmentId);
    }

    // Remove members no longer in the list
    for (const userId of membersToRemove) {
      await removeUserFromDepartment(userId, departmentId);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Department members updated successfully',
    });
  } catch (error) {
    console.error('Error updating department members:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 