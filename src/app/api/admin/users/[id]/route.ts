'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // First perform a truly asynchronous operation
    const currentUser = await getCurrentUser();
    
    // Now it's safe to use params
    const userId = params.id;
    
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin role
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { role, status } = await request.json();
    
    const { databases } = await createAdminClient();

    // Update user data
    const updatedData: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };
    
    if (role) updatedData.role = role;
    if (status) updatedData.status = status;
    
    // Update user in Appwrite
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId,
      updatedData
    );

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // First perform a truly asynchronous operation
    const currentUser = await getCurrentUser();
    
    // Now it's safe to use params
    const userId = params.id;
    
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin role
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();

    // Soft delete user by setting status to 'deleted'
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId,
      { 
        status: 'deleted',
        updatedAt: new Date().toISOString()
      }
    );

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 