'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query, ID } from 'node-appwrite';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { databases } = await createAdminClient();
    
    const settings = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.userSettingsCollectionId,
      [Query.equal('userId', [currentUser.$id])]
    );
    
    return NextResponse.json({
      settings: settings.total > 0 ? settings.documents[0] : null
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { databases } = await createAdminClient();
    const settings = await request.json();
    
    // First check if settings exist
    const existingSettings = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.userSettingsCollectionId,
      [Query.equal('userId', [currentUser.$id])]
    );
    
    if (existingSettings.total > 0) {
      // Update existing settings
      await databases.updateDocument(
        fullConfig.databaseId,
        fullConfig.userSettingsCollectionId,
        existingSettings.documents[0].$id,
        {
          ...settings,
          updatedAt: new Date().toISOString()
        }
      );
    } else {
      // Create new settings
      await databases.createDocument(
        fullConfig.databaseId,
        fullConfig.userSettingsCollectionId,
        ID.unique(),
        {
          userId: currentUser.$id,
          ...settings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
} 