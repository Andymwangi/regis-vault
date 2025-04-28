'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
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
    
    const { storage, databases } = await createAdminClient();
    
    // Convert file to buffer for Appwrite
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const inputFile = InputFile.fromBuffer(buffer, file.name);
    
    // Use Appwrite storage for avatar
    const avatarFile = await storage.createFile(
      fullConfig.storageId,
      ID.unique(),
      inputFile
    );
    
    const avatarUrl = `${fullConfig.endpoint}/storage/buckets/${fullConfig.storageId}/files/${avatarFile.$id}/view?project=${fullConfig.projectId}`;
    
    // Update user's profile
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      currentUser.$id,
      {
        avatar: avatarUrl,
        updatedAt: new Date().toISOString(),
      }
    );
    
    return NextResponse.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { message: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
} 