import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, role } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }
    
    // Only allow users to modify their own role
    if (userId !== currentUser.$id) {
      return NextResponse.json({ error: 'You can only modify your own role' }, { status: 401 });
    }

    // Validate role
    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    console.log('Updating role for user:', userId, 'to:', role);
    
    const { databases } = await createAdminClient();
    
    // Find user document by accountId
    const users = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      []
    );
    
    const userDoc = users.documents.find(doc => doc.$id === userId);
    
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('Found user document:', userDoc.$id);
    
    // Update user role
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userDoc.$id,
      { 
        role,
        updatedAt: new Date().toISOString()
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }
} 