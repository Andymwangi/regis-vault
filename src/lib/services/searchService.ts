import { db } from '@/lib/db';
import { files, departments, fileTags, ocrResults } from '@/server/db/schema/schema';
import { eq, and, or, like, sql } from 'drizzle-orm';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  department: string;
  uploadedBy: string;
  relevance: number;
  matchedTags: string[];
  preview?: string;
}

export class SearchService {
  static async searchFiles(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      // Search across multiple fields with different weights
      const searchResults = await db.select({
        id: files.id,
        name: files.name,
        type: files.type,
        department: departments.name,
        uploadedBy: sql<string>`CONCAT(${files.userId})`,
        relevance: sql<number>`
          CASE
            WHEN LOWER(${files.name}) LIKE LOWER(${'%' + query + '%'}) THEN 3
            WHEN LOWER(${departments.name}) LIKE LOWER(${'%' + query + '%'}) THEN 2
            WHEN LOWER(${ocrResults.text}) LIKE LOWER(${'%' + query + '%'}) THEN 1
            ELSE 0
          END
        `,
        matchedTags: sql<string[]>`ARRAY_AGG(DISTINCT ${fileTags.tag})`,
        preview: sql<string>`
          CASE
            WHEN POSITION(LOWER(${query}) IN LOWER(${ocrResults.text})) > 0
            THEN SUBSTRING(${ocrResults.text}, 
              GREATEST(1, POSITION(LOWER(${query}) IN LOWER(${ocrResults.text})) - 50),
              150)
            ELSE NULL
          END
        `
      })
      .from(files)
      .leftJoin(departments, eq(files.departmentId, departments.id))
      .leftJoin(fileTags, eq(files.id, fileTags.fileId))
      .leftJoin(ocrResults, eq(files.id, ocrResults.fileId))
      .where(
        and(
          eq(files.status, 'active'),
          or(
            like(files.name, `%${query}%`),
            like(departments.name, `%${query}%`),
            like(ocrResults.text, `%${query}%`),
            sql`EXISTS (
              SELECT 1 FROM ${fileTags}
              WHERE ${fileTags.fileId} = ${files.id}
              AND LOWER(${fileTags.tag}) LIKE LOWER(${'%' + query + '%'})
            )`
          )
        )
      )
      .groupBy(files.id, departments.name, ocrResults.text)
      .orderBy(sql`relevance DESC`)
      .limit(limit);

      // Process and format results
      return searchResults.map(result => ({
        ...result,
        department: result.department || 'N/A',
        matchedTags: result.matchedTags.filter(Boolean),
        preview: result.preview ? `...${result.preview}...` : undefined
      }));
    } catch (error) {
      console.error('Search error:', error);
      throw new Error('Failed to perform search');
    }
  }

  static async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    try {
      // Get tag suggestions
      const tagSuggestions = await db.select({
        tag: fileTags.tag,
        count: sql<number>`COUNT(*)`
      })
      .from(fileTags)
      .where(like(fileTags.tag, `%${query}%`))
      .groupBy(fileTags.tag)
      .orderBy(sql`count DESC`)
      .limit(limit);

      // Get department suggestions
      const departmentSuggestions = await db.select({
        name: departments.name
      })
      .from(departments)
      .where(like(departments.name, `%${query}%`))
      .limit(limit);

      // Combine and deduplicate suggestions
      const suggestions = [
        ...tagSuggestions.map(t => t.tag),
        ...departmentSuggestions.map(d => d.name)
      ];

      return [...new Set(suggestions)].slice(0, limit);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }
} 