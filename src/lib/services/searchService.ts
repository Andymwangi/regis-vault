"use server";

import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

export interface SearchResult {
  id: string;
  name: string;
  type: string;
  department: string;
  uploadedBy: string;
  relevance: number;
  matchedTags: string[];
  preview?: string;
}

export async function searchFiles(query: string, limit: number = 10): Promise<SearchResult[]> {
  try {
    const { databases } = await createAdminClient();
    
    // First, search in OCR results for content matches
    const ocrResults = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      [
        Query.search('text', query),
        Query.limit(limit)
      ]
    );
    
    // Get file IDs from OCR results
    const fileIds = ocrResults.documents.map(doc => doc.fileId);
    
    // Then search by filename
    const fileResults = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [
        Query.equal('status', ['active']),
        Query.or([
          Query.search('name', query),
          Query.equal('$id', fileIds)
        ]),
        Query.limit(limit)
      ]
    );
    
    // Convert to our search result format
    const results = await Promise.all(fileResults.documents.map(async (file) => {
      // Get owner info
      let ownerName = 'Unknown';
      if (file.ownerId) {
        try {
          const owner = await databases.getDocument(
            fullConfig.databaseId,
            fullConfig.usersCollectionId,
            file.ownerId
          );
          ownerName = owner.fullName;
        } catch (error) {
          // User not found
        }
      }
      
      // Get department info
      let departmentName = 'N/A';
      if (file.departmentId) {
        try {
          const department = await databases.getDocument(
            fullConfig.databaseId,
            'departments',
            file.departmentId
          );
          departmentName = department.name;
        } catch (error) {
          // Department not found
        }
      }
      
      // Get matched tags
      let matchedTags: string[] = [];
      try {
        const tagsResult = await databases.listDocuments(
          fullConfig.databaseId,
          'file_tags',
          [
            Query.equal('fileId', [file.$id]),
            Query.search('tag', query)
          ]
        );
        
        matchedTags = tagsResult.documents.map(t => t.tag);
      } catch (error) {
        // Error fetching tags
      }
      
      // Get OCR preview if available
      let preview: string | undefined = undefined;
      let relevance = 1; // Default relevance for filename match
      
      try {
        const ocrResult = await databases.listDocuments(
          fullConfig.databaseId,
          fullConfig.ocrResultsCollectionId,
          [Query.equal('fileId', [file.$id])]
        );
        
        if (ocrResult.total > 0 && ocrResult.documents[0].text) {
          const text = ocrResult.documents[0].text;
          const lowerText = text.toLowerCase();
          const lowerQuery = query.toLowerCase();
          
          if (lowerText.includes(lowerQuery)) {
            const position = lowerText.indexOf(lowerQuery);
            const start = Math.max(0, position - 50);
            const end = Math.min(text.length, position + query.length + 50);
            preview = `...${text.substring(start, end)}...`;
            relevance = 3; // Higher relevance for content match
          }
        }
      } catch (error) {
        // Error fetching OCR results
      }
      
      // Increase relevance if tags match
      if (matchedTags.length > 0) {
        relevance = Math.max(relevance, 2); // Tag match has medium relevance
      }
      
      return {
        id: file.$id,
        name: file.name,
        type: file.type,
        department: departmentName,
        uploadedBy: ownerName,
        relevance,
        matchedTags,
        preview
      };
    }));
    
    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  } catch (error) {
    console.error('Search error:', error);
    throw new Error('Failed to perform search');
  }
}

export async function getSuggestions(query: string, limit: number = 5): Promise<string[]> {
  try {
    const { databases } = await createAdminClient();
    
    // Get tag suggestions
    const tagSuggestions = await databases.listDocuments(
      fullConfig.databaseId,
      'file_tags',
      [
        Query.search('tag', query),
        Query.limit(limit)
      ]
    );
    
    // Get department suggestions
    const departmentSuggestions = await databases.listDocuments(
      fullConfig.databaseId,
      'departments',
      [
        Query.search('name', query),
        Query.limit(limit)
      ]
    );
    
    // Get content suggestions from OCR results
    const contentSuggestions = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      [
        Query.search('text', query),
        Query.limit(limit)
      ]
    );
    
    // Combine suggestions
    const suggestions = [
      ...tagSuggestions.documents.map(t => t.tag),
      ...departmentSuggestions.documents.map(d => d.name),
      ...contentSuggestions.documents.map(c => {
        const text = c.text;
        const position = text.toLowerCase().indexOf(query.toLowerCase());
        if (position !== -1) {
          const start = Math.max(0, position - 20);
          const end = Math.min(text.length, position + query.length + 20);
          return `...${text.substring(start, end)}...`;
        }
        return '';
      }).filter(Boolean)
    ];
    
    // Remove duplicates and limit
    return [...new Set(suggestions)].slice(0, limit);
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return [];
  }
} 