'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';

export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();

    // Fetch files 
    const filesList = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [Query.equal('status', ['active']), Query.orderDesc('updatedAt')]
    );

    // Fetch tags for each file
    const filesWithTags = await Promise.all(
      filesList.documents.map(async (file) => {
        const tagsResult = await databases.listDocuments(
          fullConfig.databaseId,
          fullConfig.documentTagsCollectionId,
          [Query.equal('fileId', [file.$id])]
        );

        return {
          id: file.$id,
          name: file.name,
          type: file.type,
          department: file.departmentId || '',
          lastModified: file.updatedAt,
          tags: tagsResult.documents.map(t => t.tag)
        };
      })
    );

    return NextResponse.json({ files: filesWithTags });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

interface TagInput {
  tag: string;
  category: string;
  confidence?: number;
}

export async function POST(request: Request) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId, tags } = await request.json();
    const { databases } = await createAdminClient();

    // Delete existing tags
    const existingTags = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.documentTagsCollectionId,
      [Query.equal('fileId', [fileId])]
    );

    // Delete each tag document
    for (const tag of existingTags.documents) {
      await databases.deleteDocument(
        fullConfig.databaseId,
        fullConfig.documentTagsCollectionId,
        tag.$id
      );
    }

    // Insert new tags
    if (tags.length > 0) {
      for (const tag of tags) {
        await databases.createDocument(
          fullConfig.databaseId,
          fullConfig.documentTagsCollectionId,
          'unique()',
          {
            fileId,
            tag: tag.tag,
            category: tag.category,
            confidence: tag.confidence || 0
          }
        );
      }
    }

    return NextResponse.json({ message: 'Tags updated successfully' });
  } catch (error) {
    console.error('Error updating tags:', error);
    return NextResponse.json(
      { error: 'Failed to update tags' },
      { status: 500 }
    );
  }
} 