'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { files, departments, fileTags } from '@/server/db/schema/schema';
import { eq, sql } from 'drizzle-orm';
import { account } from '@/lib/appwrite/config';

export async function GET(request: Request) {
  try {
    // Check if user is authenticated with Appwrite
    let user;
    try {
      user = await account.get();
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch files with their departments and tags
    const filesList = await db
      .select({
        id: files.id,
        name: files.name,
        type: files.type,
        department: departments.name,
        lastModified: files.updatedAt,
      })
      .from(files)
      .leftJoin(departments, eq(files.departmentId, departments.id))
      .where(eq(files.status, 'active'))
      .orderBy(files.updatedAt);

    // Fetch tags for each file
    const filesWithTags = await Promise.all(
      filesList.map(async (file) => {
        const tags = await db
          .select({
            tag: fileTags.tag,
            category: fileTags.category,
            confidence: fileTags.confidence,
          })
          .from(fileTags)
          .where(eq(fileTags.fileId, file.id));

        return {
          ...file,
          tags: tags.map(t => t.tag),
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
    // Check if user is authenticated with Appwrite
    let user;
    try {
      user = await account.get();
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId, tags } = await request.json();

    // Delete existing tags
    await db.delete(fileTags)
      .where(eq(fileTags.fileId, fileId));

    // Insert new tags
    if (tags.length > 0) {
      await db.insert(fileTags)
        .values(tags.map((tag: TagInput) => ({
          fileId,
          tag: tag.tag,
          category: tag.category,
          confidence: tag.confidence
        })));
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