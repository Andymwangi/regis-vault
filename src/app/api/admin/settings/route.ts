'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query, ID } from 'node-appwrite';
import { rateLimitMiddleware } from '@/middleware/rate-limit';

// Default settings if none exist in the database
const defaultSettings = {
  maintenanceMode: false,
  allowRegistration: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  email: {
    serviceId: '',
    templateId: '',
    publicKey: '',
    fromEmail: 'noreply@example.com',
  },
  security: {
    require2FA: false,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    maxLoginAttempts: 5,
  },
  backup: {
    automaticBackup: false,
    backupFrequency: 24 * 60 * 60 * 1000, // 24 hours
    retentionDays: 30,
  },
};

// Remove the hardcoded collection ID since we're using it from config
// const SETTINGS_COLLECTION_ID = 'app_settings';

export async function GET(request: Request) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitMiddleware(request as any, 'settings:get');
  if (rateLimitResponse.status === 429) return rateLimitResponse;

  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin role
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    
    // Try to get settings from Appwrite
    try {
      const settingsResult = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.appSettingsCollectionId,
        []
      );
      
      // Convert array of settings to object
      const settingsObject = settingsResult.documents.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);
      
      // Merge with default settings
      const mergedSettings = {
        ...defaultSettings,
        ...settingsObject,
      };
      
      return NextResponse.json(mergedSettings);
    } catch (error) {
      // If the collection doesn't exist or there's an error, return default settings
      console.error('Error fetching settings, returning defaults:', error);
      return NextResponse.json(defaultSettings);
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitMiddleware(request as any, 'settings:put');
  if (rateLimitResponse.status === 429) return rateLimitResponse;

  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin role
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    const newSettings = await request.json();

    // Validate settings structure
    if (!validateSettings(newSettings)) {
      return NextResponse.json({ message: 'Invalid settings format' }, { status: 400 });
    }

    // Convert settings object to array of documents to create/update
    try {
      // First, try to get existing settings
      const existingSettings = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.appSettingsCollectionId,
        []
      );
      
      const existingMap = new Map(
        existingSettings.documents.map(setting => [setting.key, setting.$id])
      );
      
      // Update settings in Appwrite
      for (const [key, value] of Object.entries(newSettings)) {
        if (existingMap.has(key)) {
          // Update existing setting
          await databases.updateDocument(
            fullConfig.databaseId,
            fullConfig.appSettingsCollectionId,
            existingMap.get(key)!,
            {
              value,
              updatedAt: new Date().toISOString(),
            }
          );
        } else {
          // Create new setting
          await databases.createDocument(
            fullConfig.databaseId,
            fullConfig.appSettingsCollectionId,
            ID.unique(),
            {
              key,
              value,
              description: `Setting for ${key}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          );
        }
      }
      
      return NextResponse.json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Error updating settings:', error);
      return NextResponse.json({ message: 'Failed to update settings' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

function validateSettings(settings: any): boolean {
  // Add validation logic here
  // This is a basic example - you should add more thorough validation
  return (
    typeof settings === 'object' &&
    typeof settings.maintenanceMode === 'boolean' &&
    typeof settings.allowRegistration === 'boolean' &&
    typeof settings.maxFileSize === 'number' &&
    Array.isArray(settings.allowedFileTypes) &&
    typeof settings.email === 'object' &&
    typeof settings.security === 'object' &&
    typeof settings.backup === 'object'
  );
} 