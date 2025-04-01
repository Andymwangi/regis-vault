'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'appwrite';
import { account, databases, DATABASES, COLLECTIONS, sanitizeUserId } from '@/lib/appwrite/config';
import { db } from '@/lib/db';
import { users } from '@/server/db/schema/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(2),
});

export async function PUT(request: NextRequest) {
  try {
    // Get the current user using Appwrite
    let currentUser;
    let userProfile;
    
    try {
      currentUser = await account.get();
      
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
      
      userProfile = userProfiles.documents[0];
    } catch (error) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: 'Invalid data', errors: result.error.errors },
        { status: 400 }
      );
    }

    const { name } = result.data;

    // Update in PostgreSQL
    const [updatedUser] = await db
      .update(users)
      .set({
        name,
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.$id))
      .returning();
      
    // Also update in Appwrite
    await databases.updateDocument(
      DATABASES.MAIN,
      COLLECTIONS.DEPARTMENTS,
      userProfile.$id,
      {
        name,
        updatedAt: new Date().toISOString(),
      }
    );

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { message: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 