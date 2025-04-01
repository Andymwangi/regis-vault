'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'appwrite';
import { account, databases, DATABASES, COLLECTIONS, sanitizeUserId } from '@/lib/appwrite/config';
import { db } from '@/lib/db';
import { settings } from '@/server/db/schema/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get the current user using Appwrite
    const currentUser = await account.get();
    
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user profile data
    const userProfiles = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.DEPARTMENTS,
      [
        Query.equal('userId', sanitizeUserId(currentUser.$id))
      ]
    );
    
    if (userProfiles.documents.length === 0) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }
    
    const userProfile = userProfiles.documents[0];
    
    const userSettings = await db.query.settings.findFirst({
      where: eq(settings.key, sql`user_${currentUser.$id}`),
    });

    return NextResponse.json(userSettings?.value || {});
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
    // Get the current user using Appwrite
    const currentUser = await account.get();
    
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user profile data
    const userProfiles = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.DEPARTMENTS,
      [
        Query.equal('userId', sanitizeUserId(currentUser.$id))
      ]
    );
    
    if (userProfiles.documents.length === 0) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { theme, notifications, emailNotifications } = body;

    const [updatedSettings] = await db
      .update(settings)
      .set({
        value: { theme, notifications, emailNotifications },
        updatedAt: new Date(),
      })
      .where(eq(settings.key, sql`user_${currentUser.$id}`))
      .returning();

    return NextResponse.json(updatedSettings.value);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { message: 'Failed to update settings' },
      { status: 500 }
    );
  }
} 