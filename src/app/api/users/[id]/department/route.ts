import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { revalidatePath } from 'next/cache';

/**
 * Update user's department
 * @method PUT
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only allow users to update their own department or admins to update any user
    if (currentUser.$id !== params.id && currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own department' },
        { status: 403 }
      );
    }

    // Parse request body
    const { departmentId } = await req.json();

    // Get the Appwrite client
    const { databases } = await createAdminClient();

    // Update user department
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      params.id,
      { 
        department: departmentId,
        updatedAt: new Date().toISOString()
      }
    );

    // Revalidate paths
    revalidatePath('/dashboard/profile');
    revalidatePath(`/dashboard/admin/users/${params.id}`);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'User department updated successfully',
    });
  } catch (error) {
    console.error('Error updating user department:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 