'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query, ID } from 'node-appwrite';

// Remove the hardcoded collection ID since we're using it from config
// const SETTINGS_COLLECTION_ID = 'user_settings';

export async function GET(request: NextRequest) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Use Appwrite client
    const { databases } = await createAdminClient();
    
    // Try to find user settings
    try {
      const settingsDocuments = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.userSettingsCollectionId,
        [Query.equal('userId', [currentUser.$id])]
      );
      
      if (settingsDocuments.total > 0) {
        return NextResponse.json(settingsDocuments.documents[0].preferences || {});
      } else {
        // No settings found, return empty object
        return NextResponse.json({});
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // If collection doesn't exist yet, return empty settings
      return NextResponse.json({});
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { message: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { theme, notifications, emailNotifications } = body;

    // Use Appwrite client
    const { databases } = await createAdminClient();
    
    try {
      // Find existing settings
      const settingsDocuments = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.userSettingsCollectionId,
        [Query.equal('userId', [currentUser.$id])]
      );
      
      const preferences = { theme, notifications, emailNotifications };
      
      if (settingsDocuments.total > 0) {
        // Update existing settings
        const updatedSettings = await databases.updateDocument(
          fullConfig.databaseId,
          fullConfig.userSettingsCollectionId,
          settingsDocuments.documents[0].$id,
          {
            preferences,
            updatedAt: new Date().toISOString()
          }
        );
        
        return NextResponse.json(updatedSettings.preferences);
      } else {
        // Create new settings
        const newSettings = await databases.createDocument(
          fullConfig.databaseId,
          fullConfig.userSettingsCollectionId,
          ID.unique(),
          {
            userId: currentUser.$id,
            preferences,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        );
        
        return NextResponse.json(newSettings.preferences);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      // Attempt to create the collection if it doesn't exist
      return NextResponse.json(
        { message: 'Settings collection may not exist yet' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { message: 'Failed to update settings' },
      { status: 500 }
    );
  }
} 