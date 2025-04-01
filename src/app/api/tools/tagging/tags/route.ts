'use server';

import { NextResponse } from 'next/server';
import { account } from '@/lib/appwrite/config';
import { addTag, removeTag, getTagsForFile } from '@/lib/services/taggingService';

export async function POST(request: Request) {
  try {
    // Check if user is authenticated with Appwrite
    let user;
    try {
      user = await account.get();
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process request body
    const { fileId, tag, category = 'other', confidence = 100 } = await request.json();

    if (!fileId || !tag) {
      return NextResponse.json(
        { error: 'File ID and tag are required' },
        { status: 400 }
      );
    }

    // Add tag using our hybrid approach
    await addTag({
      fileId,
      tag,
      category,
      confidence,
      source: 'manual',
      userId: user.$id.substring(0, 36)
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Tag added successfully' 
    });
  } catch (error) {
    console.error('Error adding tag:', error);
    return NextResponse.json(
      { error: 'Failed to add tag', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // Check if user is authenticated with Appwrite
    try {
      await account.get();
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process request body
    const { fileId, tag } = await request.json();

    if (!fileId || !tag) {
      return NextResponse.json(
        { error: 'File ID and tag are required' },
        { status: 400 }
      );
    }

    // Remove tag using our hybrid approach
    await removeTag(fileId, tag);

    return NextResponse.json({ 
      success: true, 
      message: 'Tag removed successfully' 
    });
  } catch (error) {
    console.error('Error removing tag:', error);
    return NextResponse.json(
      { error: 'Failed to remove tag', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Check if user is authenticated with Appwrite
    try {
      await account.get();
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get file ID from query parameters
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get tags for file using our hybrid approach
    const tags = await getTagsForFile(fileId);

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error getting tags:', error);
    return NextResponse.json(
      { error: 'Failed to get tags', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 