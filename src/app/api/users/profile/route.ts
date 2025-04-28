'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(2),
});

export async function PUT(request: NextRequest) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { databases } = await createAdminClient();

    const body = await request.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: 'Invalid data', errors: result.error.errors },
        { status: 400 }
      );
    }

    const { name } = result.data;

    // Update in Appwrite
    const updatedUser = await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      currentUser.$id,
      {
        fullName: name,
        updatedAt: new Date().toISOString(),
      }
    );

    return NextResponse.json({
      id: updatedUser.$id,
      name: updatedUser.fullName,
      updatedAt: updatedUser.updatedAt
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { message: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 