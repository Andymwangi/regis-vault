'use server';

import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Query } from 'appwrite';
import { account, databases, storage, DATABASES, COLLECTIONS, STORAGE_BUCKETS, ID, sanitizeUserId, getUserProfileById } from '@/lib/appwrite/config';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    // Get the current user using Appwrite
    try {
      const currentUser = await account.get();
      if (!currentUser) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
      
      // Process form data
      const formData = await request.formData();
      const file = formData.get('avatar') as File;
      
      if (!file) {
        return NextResponse.json(
          { message: 'No file provided' },
          { status: 400 }
        );
      }
      
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { message: 'File must be an image' },
          { status: 400 }
        );
      }
      
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { message: 'File size must be less than 5MB' },
          { status: 400 }
        );
      }
      
      // Use Appwrite storage for avatar
      const avatarFile = await storage.createFile(
        STORAGE_BUCKETS.FILES,
        ID.unique(),
        file
      );
      
      const avatarUrl = storage.getFileView(STORAGE_BUCKETS.FILES, avatarFile.$id);
      
      // Get user profile data using the helper function
      const userProfileData = await getUserProfileById(currentUser.$id);
      
      if (!userProfileData) {
        return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
      }
      
      const { profile: userProfile, source } = userProfileData;
      
      // Update user's profile in the appropriate collection
      await databases.updateDocument(
        DATABASES.MAIN,
        source === 'users' ? COLLECTIONS.USERS : COLLECTIONS.DEPARTMENTS,
        userProfile.$id,
        {
          avatarUrl: avatarUrl,
          updatedAt: new Date().toISOString(),
        }
      );
      
      return NextResponse.json({
        message: 'Avatar uploaded successfully',
        avatarUrl,
      });
    } catch (error) {
      console.error('Authentication error:', error);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { message: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
} 