import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db/db';
import { files, fileTags } from '@/server/db/schema/schema';
import { eq, sql } from 'drizzle-orm';

interface TagSuggestion {
  tag: string;
  category: string;
  confidence: number;
}

function generateSuggestions(file: {
  id: string;
  name: string;
  type: string;
  url: string;
}): TagSuggestion[] {
  const suggestions: TagSuggestion[] = [];
  
  // Add suggestions based on file type
  if (file.type.includes('pdf')) {
    suggestions.push({
      tag: 'Document',
      category: 'type',
      confidence: 0.9
    });
  }
  
  if (file.type.includes('image')) {
    suggestions.push({
      tag: 'Image',
      category: 'type',
      confidence: 0.9
    });
  }
  
  // Add suggestions based on file name
  const fileName = file.name.toLowerCase();
  if (fileName.includes('report')) {
    suggestions.push({
      tag: 'Report',
      category: 'type',
      confidence: 0.8
    });
  }
  
  if (fileName.includes('contract')) {
    suggestions.push({
      tag: 'Contract',
      category: 'type',
      confidence: 0.8
    });
  }
  
  if (fileName.includes('invoice')) {
    suggestions.push({
      tag: 'Invoice',
      category: 'type',
      confidence: 0.8
    });
  }
  
  // Add department suggestions if available
  if (file.url.includes('/departments/')) {
    const department = file.url.split('/departments/')[1].split('/')[0];
    suggestions.push({
      tag: department.charAt(0).toUpperCase() + department.slice(1),
      category: 'department',
      confidence: 0.9
    });
  }
  
  return suggestions;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get file details
    const [file] = await db
      .select({
        id: files.id,
        name: files.name,
        type: files.type,
        url: files.url,
      })
      .from(files)
      .where(eq(files.id, sql`${fileId}::uuid`));

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Get existing tags
    const existingTags = await db
      .select({
        tag: fileTags.tag,
      })
      .from(fileTags)
      .where(eq(fileTags.fileId, sql`${fileId}::integer`));

    const existingTagSet = new Set(existingTags.map(t => t.tag));

    // Generate suggestions
    const suggestions = generateSuggestions(file);

    // Filter out existing tags and sort by confidence
    const newSuggestions = suggestions
      .filter(s => !existingTagSet.has(s.tag))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10); // Limit to top 10 suggestions

    return NextResponse.json({ suggestions: newSuggestions });
  } catch (error) {
    console.error('Error getting tag suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to get tag suggestions' },
      { status: 500 }
    );
  }
} 