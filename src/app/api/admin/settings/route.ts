import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db/db';
import { settings } from '@/server/db/schema/schema';
import { eq } from 'drizzle-orm';
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

export async function GET(request: Request) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitMiddleware(request as any, 'settings:get');
  if (rateLimitResponse.status === 429) return rateLimitResponse;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Get all settings from the database
    const dbSettings = await db.select().from(settings);
    
    // Convert array of settings to object
    const settingsObject = dbSettings.reduce((acc, setting) => {
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
    console.error('Error fetching settings:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(request: Request) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitMiddleware(request as any, 'settings:put');
  if (rateLimitResponse.status === 429) return rateLimitResponse;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const newSettings = await request.json();

    // Validate settings structure
    if (!validateSettings(newSettings)) {
      return new NextResponse('Invalid settings format', { status: 400 });
    }

    // Convert settings object to array of key-value pairs
    const settingsArray = Object.entries(newSettings).map(([key, value]) => ({
      key,
      value,
      description: `Setting for ${key}`,
      updatedAt: new Date(),
    }));

    // Update settings in the database
    for (const setting of settingsArray) {
      await db
        .insert(settings)
        .values(setting)
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: setting.value,
            updatedAt: setting.updatedAt,
          },
        });
    }

    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
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