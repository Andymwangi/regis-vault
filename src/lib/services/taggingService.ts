"use server";

import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { Query, ID } from 'node-appwrite';

export interface TagInput {
  fileId: string;
  tag: string;
  category: string;
  confidence?: number;
  source?: 'manual' | 'ai' | 'system';
  userId?: string;
}

/**
 * Add a tag to a file, storing in Appwrite
 */
export async function addTag(tagData: TagInput): Promise<void> {
  try {
    const { databases } = await createAdminClient();
    
    // Create tag in Appwrite
    await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.documentTagsCollectionId,
      ID.unique(),
      {
        fileId: tagData.fileId,
        tag: tagData.tag,
        confidence: tagData.confidence || 100,
        category: tagData.category || 'other',
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
 * Remove a tag from a file in Appwrite
 */
export async function removeTag(fileId: string, tag: string): Promise<void> {
  try {
    const { databases } = await createAdminClient();
    
    // Remove from Appwrite
    const tags = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.documentTagsCollectionId,
      [
        Query.equal('fileId', [fileId]),
        Query.equal('tag', [tag])
      ]
    );
    
    for (const tagDoc of tags.documents) {
      await databases.deleteDocument(
        fullConfig.databaseId,
        fullConfig.documentTagsCollectionId,
        tagDoc.$id
      );
    }
  } catch (error) {
    console.error('Error removing tag:', error);
    throw error;
  }
}

/**
 * Get all tags for a file from Appwrite
 */
export async function getTagsForFile(fileId: string): Promise<TagInput[]> {
  try {
    const { databases } = await createAdminClient();
    
    // Get tags from Appwrite for detailed metadata
    const appwriteTags = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.documentTagsCollectionId,
      [Query.equal('fileId', [fileId])]
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
 * Get the filename from Appwrite using fileId
 * Now tries both databases and storage to find file information
 */
export async function getFileName(fileId: string): Promise<string> {
  const { storage, databases } = await createAdminClient();
  
  try {
    // First try to get the file from storage
    try {
      const file = await storage.getFile(fullConfig.storageId, fileId);
      return file.name || '';
    } catch (storageError) {
      console.log('File not found in storage, trying files collection:', storageError);
    }
    
    // If storage lookup fails, try the files collection
    try {
      const fileDoc = await databases.getDocument(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        fileId
      );
      
      if (fileDoc && fileDoc.name) {
        return fileDoc.name;
      }
      
      // If we have a bucketFieldId, try to get that from storage
      if (fileDoc && fileDoc.bucketFieldId) {
        try {
          const bucketFile = await storage.getFile(fullConfig.storageId, fileDoc.bucketFieldId);
          return bucketFile.name || '';
        } catch (bucketError) {
          console.log('Bucket file not found:', bucketError);
        }
      }
    } catch (dbError) {
      console.log('File not found in database:', dbError);
    }
    
    // Last resort - try to get file from the files collection using bucketFileId
    try {
      const filesWithBucketId = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        [Query.equal('bucketFieldId', [fileId])]
      );
      
      if (filesWithBucketId.documents.length > 0) {
        return filesWithBucketId.documents[0].name || '';
      }
    } catch (listError) {
      console.log('Error listing files by bucketId:', listError);
    }
    
    // If all attempts fail, return a generic filename with the ID
    return `file-${fileId}`;
  } catch (error) {
    console.error('Error getting file name:', error);
    return `file-${fileId}`; // Return a fallback filename
  }
}

/**
 * Generate tag suggestions based on filename or fileId if filename can't be found
 */
export async function generateTagSuggestionsFromFilename(fileId: string, fileName: string): Promise<TagInput[]> {
  try {
    const suggestions: TagInput[] = [];
    
    // If no filename is provided or it's just the default, add a basic tag based on fileId
    if (!fileName || fileName === `file-${fileId}`) {
      suggestions.push({
        fileId,
        tag: 'Unknown Type',
        category: 'file_type',
        confidence: 50,
        source: 'ai'
      });
      
      return suggestions;
    }
    
    // Extract file extension for file type tagging
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    if (fileExtension) {
      let category = 'file_type';
      let confidence = 90;
      
      // Map common file extensions to more descriptive tags
      switch (fileExtension) {
        case 'pdf':
          suggestions.push({
            fileId,
            tag: 'PDF',
            category,
            confidence,
            source: 'ai'
          });
          break;
        case 'doc':
        case 'docx':
          suggestions.push({
            fileId,
            tag: 'Word Document',
            category,
            confidence,
            source: 'ai'
          });
          break;
        case 'xls':
        case 'xlsx':
          suggestions.push({
            fileId,
            tag: 'Spreadsheet',
            category,
            confidence,
            source: 'ai'
          });
          break;
        case 'jpg':
        case 'jpeg':
        case 'png':
          suggestions.push({
            fileId,
            tag: 'Image',
            category,
            confidence,
            source: 'ai'
          });
          break;
        default:
          suggestions.push({
            fileId,
            tag: fileExtension.toUpperCase(),
            category,
            confidence: 85,
            source: 'ai'
          });
      }
    }
    
    // Extract potential document types from filename
    const documentTypes = [
      { keyword: 'invoice', tag: 'Invoice' },
      { keyword: 'receipt', tag: 'Receipt' },
      { keyword: 'report', tag: 'Report' },
      { keyword: 'contract', tag: 'Contract' },
      { keyword: 'proposal', tag: 'Proposal' },
      { keyword: 'letter', tag: 'Letter' },
      { keyword: 'resume', tag: 'Resume' },
      { keyword: 'cv', tag: 'CV' },
      { keyword: 'political acts', tag: 'Political Acts' },
    ];
    
    const fileNameLower = fileName.toLowerCase();
    for (const docType of documentTypes) {
      if (fileNameLower.includes(docType.keyword)) {
        suggestions.push({
          fileId,
          tag: docType.tag,
          category: 'document_type',
          confidence: 80,
          source: 'ai'
        });
      }
    }
    
    // Extract department references
    const departments = [
      { keyword: 'hr', tag: 'HR' },
      { keyword: 'finance', tag: 'Finance' },
      { keyword: 'accounting', tag: 'Finance' },
      { keyword: 'legal', tag: 'Legal' },
      { keyword: 'marketing', tag: 'Marketing' },
      { keyword: 'sales', tag: 'Sales' },
      { keyword: 'it', tag: 'IT' },
      { keyword: 'tech', tag: 'IT' },
      { keyword: 'operations', tag: 'Operations' },
    ];
    
    for (const dept of departments) {
      // Check for whole word matches using word boundaries when possible
      const regex = new RegExp(`\\b${dept.keyword}\\b`, 'i');
      if (regex.test(fileNameLower)) {
        suggestions.push({
          fileId,
          tag: dept.tag,
          category: 'department',
          confidence: 75,
          source: 'ai'
        });
      }
    }
    
    // Extract date patterns if present in filename
    const datePattern = /\b(20\d{2}|19\d{2})[_\-]?(0[1-9]|1[0-2])[_\-]?(0[1-9]|[12][0-9]|3[01])\b/;
    const dateMatch = fileNameLower.match(datePattern);
    if (dateMatch) {
      suggestions.push({
        fileId,
        tag: 'Dated Document',
        category: 'attributes',
        confidence: 75,
        source: 'ai'
      });
    }
    
    // If no suggestions were generated, add a default tag
    if (suggestions.length === 0) {
      suggestions.push({
        fileId,
        tag: 'Uncategorized',
        category: 'general',
        confidence: 50,
        source: 'ai'
      });
    }
    
    return suggestions;
  } catch (error) {
    console.error('Error generating tag suggestions from filename:', error);
    // Return at least one tag as fallback
    return [{
      fileId,
      tag: 'Uncategorized',
      category: 'general',
      confidence: 50,
      source: 'ai'
    }];
  }
}

/**
 * Generate AI tag suggestions for a file
 * This method is designed to be resilient even when file information is limited
 */
export async function generateTagSuggestions(fileId: string, fileContent: string = ''): Promise<TagInput[]> {
  try {
    // Try to get the filename
    const fileName = await getFileName(fileId).catch(err => {
      console.warn('Could not get filename, using fileId as fallback:', err);
      return `file-${fileId}`;
    });
    
    return generateTagSuggestionsFromFilename(fileId, fileName);
  } catch (error) {
    console.error('Error generating tag suggestions:', error);
    // Return a fallback tag if everything else fails
    return [{
      fileId,
      tag: 'Uncategorized',
      category: 'general',
      confidence: 50,
      source: 'ai'
    }];
  }
}