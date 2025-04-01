import { db } from '../db';
import { fileTags } from '@/server/db/schema/schema';
import { eq, sql } from 'drizzle-orm';
import { databases, DATABASES, COLLECTIONS, ID } from '../appwrite/config';
import { Query } from 'appwrite';

export interface TagInput {
  fileId: string;
  tag: string;
  category: string;
  confidence?: number;
  source?: 'manual' | 'ai' | 'system';
  userId?: string;
}

/**
 * Add a tag to a file, storing in both PostgreSQL and Appwrite
 */
export async function addTag(tagData: TagInput): Promise<void> {
  try {
    // First create tag in PostgreSQL for search and analytics
    const [pgTag] = await db.insert(fileTags).values({
      fileId: tagData.fileId,
      tag: tagData.tag,
      category: tagData.category || 'other',
      confidence: tagData.confidence || 100,
    }).returning();

    // Then create tag in Appwrite for UI and relationships
    await databases.createDocument(
      DATABASES.MAIN,
      COLLECTIONS.DOCUMENT_TAGS,
      ID.unique(),
      {
        fileId: tagData.fileId,
        tag: tagData.tag,
        confidence: tagData.confidence || 100,
        source: tagData.source || 'manual',
        userId: tagData.userId || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('Error adding tag:', error);
    throw error;
  }
}

/**
 * Remove a tag from a file in both PostgreSQL and Appwrite
 */
export async function removeTag(fileId: string, tag: string): Promise<void> {
  try {
    // Remove from PostgreSQL
    await db.delete(fileTags)
      .where(
        sql`${fileTags.fileId}::text = ${fileId} AND ${fileTags.tag} = ${tag}`
      );

    // Remove from Appwrite
    const tags = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.DOCUMENT_TAGS,
      [
        Query.equal('fileId', fileId),
        Query.equal('tag', tag)
      ]
    );

    for (const tagDoc of tags.documents) {
      await databases.deleteDocument(
        DATABASES.MAIN,
        COLLECTIONS.DOCUMENT_TAGS,
        tagDoc.$id
      );
    }
  } catch (error) {
    console.error('Error removing tag:', error);
    throw error;
  }
}

/**
 * Get all tags for a file from both PostgreSQL and Appwrite
 */
export async function getTagsForFile(fileId: string): Promise<TagInput[]> {
  try {
    // Get tags from Appwrite for detailed metadata
    const appwriteTags = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.DOCUMENT_TAGS,
      [Query.equal('fileId', fileId)]
    );

    // Format tags
    return appwriteTags.documents.map(tag => ({
      fileId: tag.fileId,
      tag: tag.tag,
      category: tag.category || 'other',
      confidence: tag.confidence,
      source: tag.source,
    }));
  } catch (error) {
    console.error('Error getting tags for file:', error);
    throw error;
  }
}

/**
 * Generate AI tag suggestions for a file
 */
export async function generateTagSuggestions(fileId: string, fileContent: string): Promise<TagInput[]> {
  try {
    // Basic tag extraction (placeholder for AI implementation)
    const suggestions: TagInput[] = [];
    
    // Extract common document types
    if (fileContent.toLowerCase().includes('invoice')) {
      suggestions.push({
        fileId,
        tag: 'Invoice',
        category: 'document_type',
        confidence: 85,
        source: 'ai'
      });
    }
    
    if (fileContent.toLowerCase().includes('report')) {
      suggestions.push({
        fileId,
        tag: 'Report',
        category: 'document_type',
        confidence: 80,
        source: 'ai'
      });
    }
    
    // Extract potential departments
    const departments = ['HR', 'Finance', 'IT', 'Legal', 'Operations'];
    for (const dept of departments) {
      if (fileContent.toLowerCase().includes(dept.toLowerCase())) {
        suggestions.push({
          fileId,
          tag: dept,
          category: 'department',
          confidence: 75,
          source: 'ai'
        });
      }
    }
    
    return suggestions;
  } catch (error) {
    console.error('Error generating tag suggestions:', error);
    throw error;
  }
} 