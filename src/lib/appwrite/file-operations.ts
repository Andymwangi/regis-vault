"use server";

import { createAdminClient, createSessionClient } from './index';
import { ID, Query } from 'node-appwrite';
import { InputFile } from "node-appwrite/file";
import { fullConfig } from './config';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/user.actions';

// Helper to get file type from filename or MIME type
export async function getFileType(input: string): Promise<{ type: string; extension: string }> {
  // Get extension from filename
  const extension = input.split('.').pop()?.toLowerCase() || '';
  
  // Determine file type based on extension or MIME type
  let type = 'other';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
    type = 'image';
  } else if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) {
    type = 'video';
  } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
    type = 'audio';
  } else if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
    type = 'document';
  }
  
  return { type, extension };
}

// Helper to construct file URL from bucket and ID
export async function getFileUrl(fileId: string): Promise<string> {
  return `${fullConfig.endpoint}/storage/buckets/${fullConfig.storageId}/files/${fileId}/view?project=${fullConfig.projectId}`;
}

// Upload a file to Appwrite
// In paste-2.txt (in the uploadFile function)
export async function uploadFile({
  file,
  ownerId,
  departmentId,
  redirectPath = '/dashboard/files'
}: {
  file: File;
  ownerId: string;
  departmentId?: string;
  redirectPath?: string;
}) {
  const { storage, databases } = await createAdminClient();
  
  try {
    // Create a buffer from the file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload file to storage
    const inputFile = InputFile.fromBuffer(buffer, file.name);
    const bucketFile = await storage.createFile(
      fullConfig.storageId,
      ID.unique(),
      inputFile
    );
    
    // Get file type and extension
    const { type, extension } = await getFileType(file.name);
    
    // Create file document with proper departmentId
    const fileData: any = {
      name: file.name,
      type,
      extension,
      size: file.size,
      url: await getFileUrl(bucketFile.$id),
      ownerId,
      sharedWith: [],
      bucketFieldId: bucketFile.$id, //
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };
    
    // Only add departmentId if it's provided and valid
    if (departmentId) {
      fileData.departmentId = departmentId;
    }
    
    const fileDocument = await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      ID.unique(),
      fileData
    );
    
    // Revalidate path to update UI
    revalidatePath(redirectPath);
    
    return fileDocument;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}

// Get files with filtering and pagination
export async function getFiles({
  type = null,
  search = '',
  sort = 'createdAt',
  order = 'desc',
  limit = 10,
  offset = 0
}: {
  type?: string | null;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  try {
    const queries = [
      Query.or([
        Query.equal('ownerId', [currentUser.$id]),
        Query.contains('sharedWith', [currentUser.$id])
      ]),
      Query.limit(limit),
      Query.offset(offset)
    ];
    
    // Add type filter if specified
    if (type && type !== 'all') {
      queries.push(Query.equal('type', [type]));
    }
    
    // Add search if provided
    if (search) {
      queries.push(Query.contains('name', search));
    }
    
    // Add sorting
    if (order === 'asc') {
      queries.push(Query.orderAsc(sort));
    } else {
      queries.push(Query.orderDesc(sort));
    }
    
    const result = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      queries
    );
    
    return {
      files: result.documents,
      total: result.total,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(result.total / limit)
    };
  } catch (error) {
    console.error('Error getting files:', error);
    throw new Error('Failed to get files');
  }
}

// Delete a file
export async function deleteFile(fileId: string, bucketFileId: string, path: string = '/dashboard/files') {
  const { storage, databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  try {
    // Check if user has permission to delete
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    if (file.ownerId !== currentUser.$id && currentUser.role !== 'admin') {
      throw new Error('Permission denied');
    }
    
    // Delete file document
    await databases.deleteDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    // Delete file from storage
    await storage.deleteFile(
      fullConfig.storageId,
      bucketFileId
    );
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
}

// Rename a file
export async function renameFile(fileId: string, newName: string, path: string = '/dashboard/files') {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  try {
    // Check if user has permission
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    if (file.ownerId !== currentUser.$id && currentUser.role !== 'admin') {
      throw new Error('Permission denied');
    }
    
    // Update file name
    const updatedFile = await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId,
      {
        name: newName,
        updatedAt: new Date().toISOString()
      }
    );
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return updatedFile;
  } catch (error) {
    console.error('Error renaming file:', error);
    throw new Error('Failed to rename file');
  }
}

// Share a file with other users
export async function shareFile(fileId: string, userIds: string[], path: string = '/dashboard/files') {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  try {
    // Check if user has permission
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    if (file.ownerId !== currentUser.$id && currentUser.role !== 'admin') {
      throw new Error('Permission denied');
    }
    
    // Update shared users
    const updatedFile = await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId,
      {
        sharedWith: userIds,
        updatedAt: new Date().toISOString()
      }
    );
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return updatedFile;
  } catch (error) {
    console.error('Error sharing file:', error);
    throw new Error('Failed to share file');
  }
}

// Get a single file by ID
export async function getFile(fileId: string) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  try {
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    // Check if user has access
    const hasAccess = 
      file.ownerId === currentUser.$id || 
      file.sharedWith.includes(currentUser.$id) ||
      currentUser.role === 'admin';
    
    if (!hasAccess) {
      throw new Error('Permission denied');
    }
    
    return file;
  } catch (error) {
    console.error('Error getting file:', error);
    throw new Error('Failed to get file');
  }
} 