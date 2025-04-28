"use server";

import { ID, Query } from 'node-appwrite';
import { createAdminClient, createSessionClient } from './index';
import { fullConfig } from './config';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { AppwriteDocumentTag } from './schema';

// Add a tag to a file
export async function addTagToFile(
  fileId: string,
  tag: string,
  category: string = 'user',
  confidence?: number,
  path: string = '/dashboard/files'
) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  try {
    // Check if file exists and user has access
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    // Check if user has access
    const hasAccess = 
      file.ownerId === currentUser.$id || 
      (Array.isArray(file.sharedWith) && file.sharedWith.includes(currentUser.$id)) ||
      currentUser.role === 'admin';
    
    if (!hasAccess) {
      throw new Error('Permission denied');
    }
    
    // Create the tag
    const tagData = {
      fileId,
      tag,
      category,
      confidence
    };
    
    const documentTag = await databases.createDocument(
      fullConfig.databaseId,
      'document_tags', // You'll need to create this collection
      ID.unique(),
      tagData
    );
    
    // Update the file's tags array if it exists
    try {
      const existingTags = Array.isArray(file.tags) ? file.tags : [];
      if (!existingTags.includes(tag)) {
        await databases.updateDocument(
          fullConfig.databaseId,
          fullConfig.filesCollectionId,
          fileId,
          {
            tags: [...existingTags, tag]
          }
        );
      }
    } catch (error) {
      console.warn('Error updating file tags array:', error);
      // Non-critical error, continue
    }
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return documentTag as AppwriteDocumentTag;
  } catch (error) {
    console.error('Error adding tag to file:', error);
    throw new Error('Failed to add tag to file');
  }
}

// Remove a tag from a file
export async function removeTagFromFile(
  tagId: string,
  fileId: string,
  tag: string,
  path: string = '/dashboard/files'
) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  try {
    // Check if file exists and user has access
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    // Check if user has access
    const hasAccess = 
      file.ownerId === currentUser.$id || 
      (Array.isArray(file.sharedWith) && file.sharedWith.includes(currentUser.$id)) ||
      currentUser.role === 'admin';
    
    if (!hasAccess) {
      throw new Error('Permission denied');
    }
    
    // Delete the tag document
    await databases.deleteDocument(
      fullConfig.databaseId,
      'document_tags',
      tagId
    );
    
    // Update the file's tags array if it exists
    try {
      const existingTags = Array.isArray(file.tags) ? file.tags : [];
      const updatedTags = existingTags.filter(t => t !== tag);
      
      if (existingTags.length !== updatedTags.length) {
        await databases.updateDocument(
          fullConfig.databaseId,
          fullConfig.filesCollectionId,
          fileId,
          {
            tags: updatedTags
          }
        );
      }
    } catch (error) {
      console.warn('Error updating file tags array:', error);
      // Non-critical error, continue
    }
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return { success: true };
  } catch (error) {
    console.error('Error removing tag from file:', error);
    throw new Error('Failed to remove tag from file');
  }
}

// Get all tags for a file
export async function getFileTags(fileId: string) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  try {
    // Check if file exists and user has access
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    // Check if user has access
    const hasAccess = 
      file.ownerId === currentUser.$id || 
      (Array.isArray(file.sharedWith) && file.sharedWith.includes(currentUser.$id)) ||
      currentUser.role === 'admin';
    
    if (!hasAccess) {
      throw new Error('Permission denied');
    }
    
    // Get all tags for this file
    const tags = await databases.listDocuments(
      fullConfig.databaseId,
      'document_tags',
      [
        Query.equal('fileId', [fileId]),
        Query.limit(100)
      ]
    );
    
    return tags.documents as AppwriteDocumentTag[];
  } catch (error) {
    console.error('Error getting file tags:', error);
    throw new Error('Failed to get file tags');
  }
}

// Search files by tag
export async function searchFilesByTag(
  tag: string,
  limit: number = 50,
  offset: number = 0
) {
  const sessionClient = await createSessionClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  if (!sessionClient) throw new Error("Session client not available");
  
  try {
    const { databases } = sessionClient;
    // First, find all files with this tag that the user has access to
    const files = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [
        Query.contains('tags', [tag]),
        Query.or([
          Query.equal('ownerId', [currentUser.$id]),
          Query.contains('sharedWith', [currentUser.$id])
        ]),
        Query.equal('status', ['active']),
        Query.limit(limit),
        Query.offset(offset)
      ]
    );
    
    return {
      files: files.documents,
      total: files.total,
      limit,
      offset
    };
  } catch (error) {
    console.error('Error searching files by tag:', error);
    throw new Error('Failed to search files by tag');
  }
}

// Get all available tags (for autocomplete)
export async function getAllTags() {
  const sessionClient = await createSessionClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  if (!sessionClient) throw new Error("Session client not available");
  
  try {
    const { databases } = sessionClient;
    // This gets all tags, but we'll need to filter for uniqueness
    const tagDocs = await databases.listDocuments(
      fullConfig.databaseId,
      'document_tags',
      [Query.limit(1000)]
    );
    
    // Extract unique tags
    const uniqueTags = Array.from(new Set(tagDocs.documents.map((doc: any) => doc.tag)));
    
    return uniqueTags;
  } catch (error) {
    console.error('Error getting all tags:', error);
    throw new Error('Failed to get all tags');
  }
} 