"use server";

import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { Query, ID } from 'node-appwrite';
import { createWorker } from 'tesseract.js';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { convertAppwriteToExistingFormat } from '../bridge/file-bridge';
import { uploadFile } from '../actions/file.actions';

// Define a type that extends Appwrite's Bucket but allows for additional properties
interface ExtendedBucket {
  // Required properties from Bucket that we know exist
  $id: string;
  name: string;
  enabled: boolean;
  
  // Properties that might be strings or booleans in the API
  compression: string | boolean;
  encryption: string | boolean;
  antivirus: string | boolean;
  
  // Add allowedFileExtensions which might be an array or undefined
  allowedFileExtensions?: string[];
  
  // Other potential properties
  fileSizeLimit?: number;
  maximum?: number;
  maxSize?: number;
  fileSize?: number;
  maxFileSize?: number;
  
  // Allow any other properties
  [key: string]: any;
}

interface FileResult {
  $id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  [key: string]: any;
}

export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  userId: string;
  departmentId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
interface ActivityData {
  date: string;
  count: number;
}
export async function getFiles(options: {
  departmentId?: string;
  type?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}) {
  const { departmentId, type, sortBy = 'updatedAt', page = 1, limit = 10 } = options;
  
  try {
    const { databases } = await createAdminClient();
    
    // Build query conditions
    const queries = [Query.equal('status', ['active'])];
    
    if (departmentId) {
      queries.push(Query.equal('departmentId', [departmentId]));
    }
    
    if (type && type !== 'all') {
      queries.push(Query.equal('type', [type]));
    }
    
    // Add sorting
    const [field, direction] = sortBy.split('-');
    if (direction === 'asc') {
      queries.push(Query.orderAsc(field));
    } else {
      queries.push(Query.orderDesc(field));
    }
    
    // Add pagination
    queries.push(Query.limit(limit));
    queries.push(Query.offset((page - 1) * limit));
    
    // Get files
    const results = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      queries
    );
    
    // Get user and department info for each file
    const enhancedFiles = await Promise.all(
      results.documents.map(async (file) => {
        let owner = null;
        let department = null;
        
        if (file.ownerId) {
          try {
            owner = await databases.getDocument(
              fullConfig.databaseId,
              fullConfig.usersCollectionId,
              file.ownerId
            );
          } catch (error) {
            // Owner not found
          }
        }
        
        if (file.departmentId) {
          try {
            department = await databases.getDocument(
              fullConfig.databaseId,
              fullConfig.departmentsCollectionId,
              file.departmentId
            );
          } catch (error) {
            // Department not found
          }
        }
        
        return {
          ...file,
          owner: owner ? {
            id: owner.$id,
            name: owner.fullName,
            email: owner.email
          } : null,
          department: department ? {
            id: department.$id,
            name: department.name
          } : null
        };
      })
    );
  
    return {
      files: enhancedFiles.map((file) => ({
        ...file,
        uploadedBy: file.owner ? file.owner.name : 'Unknown',
        department: file.department?.name || 'N/A'
      })),
      pagination: {
        total: results.total,
        pages: Math.ceil(results.total / limit),
        current: page
      }
    };
  } catch (error) {
    console.error("Error fetching files:", error);
    throw error;
  }
}

export async function deleteFiles(fileIds: string[], deletedByUserId?: string) {
  try {
    console.log(`Starting soft delete for ${fileIds.length} files`);
    const { databases } = await createAdminClient();
    
    // Get the current user if deletedByUserId is not provided
    let deletingUserId = deletedByUserId;
    if (!deletingUserId) {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          deletingUserId = currentUser.$id;
          console.log(`Using current user ID for deletion: ${deletingUserId}`);
        } else {
          console.warn('No current user found and no deletedByUserId provided');
        }
      } catch (error) {
        console.error('Failed to get current user for deletion:', error);
      }
    } else {
      console.log(`Using provided deletedByUserId: ${deletingUserId}`);
    }
    
    // Get each file to delete
    for (const fileId of fileIds) {
      try {
        console.log(`Processing file ${fileId} for deletion...`);
        // First get the file to get its bucketFileId
        const file = await databases.getDocument(
          fullConfig.databaseId,
          fullConfig.filesCollectionId,
          fileId
        );
        console.log(`Found file: ${file.name} (${file.$id})`);
        
        // Delete from database
        console.log(`Updating file ${fileId} status to 'deleted'`);
        const updateData = {
          status: 'deleted',
          updatedAt: new Date().toISOString(),
          deletedBy: deletingUserId || null,
          deletedAt: new Date().toISOString()
        };
        
        await databases.updateDocument(
          fullConfig.databaseId,
          fullConfig.filesCollectionId,
          fileId,
          updateData
        );
        console.log(`File ${fileId} marked as deleted successfully`);
        
        // Try to log activity if collection exists
        try {
          console.log('Logging deletion activity');
          if (fullConfig.activityLogsCollectionId) { // Check if collection ID is defined
            await databases.createDocument(
              fullConfig.databaseId,
              fullConfig.activityLogsCollectionId, // Use from config
              ID.unique(),
              {
                userId: deletingUserId || file.ownerId,
                type: 'DELETE_FILES',
                description: `Moved file to trash: ${file.name}`,
                createdAt: new Date().toISOString()
              }
            );
            console.log('Activity logged successfully');
          } else {
            console.log('Activity logging skipped - no collection ID configured');
          }
        } catch (activityError) {
          console.warn('Failed to log activity, continuing operation:', activityError);
          // Continue with operation even if logging fails
        }
      } catch (error) {
        console.error(`Error deleting file ${fileId}:`, error);
      }
    }
    
    console.log('File deletion operation completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error deleting files:', error);
    throw error;
  }
}

export async function updateFileAccess(fileId: string, status: string) {
  try {
    const { databases } = await createAdminClient();
    
    // Get the file first
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    // Update file status
    const updatedFile = await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId,
      {
        status,
        updatedAt: new Date().toISOString()
      }
    );
    
    // Try to log activity if collection exists
    try {
      if (fullConfig.activityLogsCollectionId) { // Check if collection ID is defined
        await databases.createDocument(
          fullConfig.databaseId,
          fullConfig.activityLogsCollectionId, // Use from config
          ID.unique(),
          {
            userId: file.ownerId,
            type: 'UPDATE_FILE_ACCESS',
            description: `Updated file ${file.name} status to ${status}`,
            createdAt: new Date().toISOString()
          }
        );
      }
    } catch (activityError) {
      console.warn('Failed to log activity:', activityError);
      // Continue with operation even if logging fails
    }
    
    return updatedFile;
  } catch (error) {
    console.error('Error updating file access:', error);
    throw error;
  }
}

export const uploadFileBridge = async (file: File, path: string = "/dashboard/files") => {
  console.log('Starting uploadFileBridge for file:', file.name);
  
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      console.error('Authentication error: User not authenticated');
      throw new Error("User is not authenticated");
    }
    
    console.log('User authenticated:', currentUser.$id);
    
    // Check if the file is being uploaded to a department
    let departmentId = currentUser.department;
    
    // Check if the path contains a department ID route (/dashboard/teams/{departmentId})
    if (path.includes('/teams/')) {
      const pathParts = path.split('/');
      const teamIndex = pathParts.indexOf('teams');
      if (teamIndex !== -1 && pathParts.length > teamIndex + 1) {
        departmentId = pathParts[teamIndex + 1];
      }
    }
    
    console.log('Department ID for upload:', departmentId);
    
    // Use the uploadFile function with department ID
    const result = await uploadFile({
      file,
      ownerId: currentUser.$id,
      departmentId, // Pass department ID
      path
    });
    
    if (!result) {
      console.error('Upload failed: No result returned from uploadFile');
      throw new Error("Failed to upload file");
    }
    
    console.log('Upload successful:', result.$id);
    
    return convertAppwriteToExistingFormat(result);
  } catch (error: any) {
    console.error('Error in uploadFileBridge:', error);
    console.error('Error details:', error.message, error.code, error.type);
    throw error;
  }
};

export async function getFileStats() {
  try {
    const { databases, storage } = await createAdminClient();
    
    // Get all active files
    const files = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [Query.equal('status', ['active'])]
    );
    
    // Get all departments
    const departments = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      []
    );
    
    // Get storage bucket details from Appwrite
    const bucketResponse = await storage.getBucket(fullConfig.storageId);
    
    // Safely handle properties with type checking
    const bucketDetails: ExtendedBucket = bucketResponse as ExtendedBucket;
    
    // Calculate total size from actual files
    const totalSize = files.documents.reduce((sum, file) => sum + (file.size || 0), 0);
    
    // Get storage limit from bucket stats with fallbacks
    const storageLimit = 
      bucketDetails.fileSizeLimit || 
      bucketDetails.maximum || 
      bucketDetails.maxSize || 
      (5 * 1024 * 1024 * 1024); // Default to 5GB if not specified
    
    // Group files by department
    const filesByDepartment = [];
    for (const dept of departments.documents) {
      const deptFiles = files.documents.filter(file => file.departmentId === dept.$id);
      const deptSize = deptFiles.reduce((sum, file) => sum + (file.size || 0), 0);
      
      filesByDepartment.push({
        departmentId: dept.$id,
        departmentName: dept.name,
        count: deptFiles.length,
        totalSize: deptSize
      });
    }
    
    // Group files by type
    const fileTypes = new Map();
    for (const file of files.documents) {
      const type = file.type || 'unknown';
      if (!fileTypes.has(type)) {
        fileTypes.set(type, { type, count: 0 });
      }
      fileTypes.get(type).count++;
    }
    
    // Create a placeholder for recent activity with empty data
    // Skip trying to access the activity_logs collection
    const recentActivityData: ActivityData[] = [];
    
    return {
      totalFiles: files.total,
      totalSize,
      storageLimit,
      filesByDepartment,
      filesByType: Array.from(fileTypes.values()),
      recentActivity: recentActivityData // Return empty array instead of trying to query
    };
  } catch (error) {
    console.error('Error getting file stats:', error);
    throw error;
  }
}

export async function extractTextFromFile(file: {
  id: string;
  name: string;
  type: string;
  url: string;
}): Promise<string | null> {
  try {
    const { databases } = await createAdminClient();
    
    // Check if OCR result already exists
    const ocrResults = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      [Query.equal('fileId', [file.id])]
    );
    
    if (ocrResults.total > 0) {
      return ocrResults.documents[0].text;
    }
    
    // Get file content from URL
    const response = await fetch(file.url);
    if (!response.ok) {
      console.error('Failed to fetch file:', response.statusText);
      return null;
    }
    const buffer = await response.arrayBuffer();
    
    let extractedText: string | null = null;
    
    if (file.type.includes('pdf')) {
      try {
        // Lazy load pdf-parse only when needed
        const pdf = (await import('pdf-parse')).default;
        const pdfData = await pdf(Buffer.from(buffer));
        extractedText = pdfData.text;
      } catch (error) {
        console.error('Error parsing PDF:', error);
        return null;
      }
    }
    
    if (file.type.includes('image')) {
      try {
        // For images, use Tesseract OCR
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(Buffer.from(buffer));
        await worker.terminate();
        extractedText = text;
      } catch (error) {
        console.error('Error performing OCR:', error);
        return null;
      }
    }
    
    if (file.type.includes('text')) {
      try {
        // For text files, convert buffer to string
        extractedText = Buffer.from(buffer).toString('utf-8');
      } catch (error) {
        console.error('Error reading text file:', error);
        return null;
      }
    }
    
    if (extractedText) {
      // Store the result in the database
      await databases.createDocument(
        fullConfig.databaseId,
        fullConfig.ocrResultsCollectionId,
        ID.unique(),
        {
          fileId: file.id,
          text: extractedText,
          status: 'completed',
          confidence: 0,
          language: 'en',
          pageCount: 1,
          processingTime: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return null;
  }
}

// New function to get storage usage details including limits
export async function getStorageDetails() {
  try {
    const { storage } = await createAdminClient();
    
    // Get bucket information using type assertion for safer access
    const bucketResponse = await storage.getBucket(fullConfig.storageId);
    // Cast to our extended interface
    const bucketDetails = bucketResponse as ExtendedBucket;
    
    // Get files in the bucket
    const files = await storage.listFiles(fullConfig.storageId);
    
    // Calculate current storage usage
    const storageUsed = files.files.reduce((total, file) => total + file.sizeOriginal, 0);
    
    // Convert any boolean values to strings if needed
    const compression = typeof bucketDetails.compression === 'boolean' 
      ? bucketDetails.compression.toString() 
      : bucketDetails.compression || 'unknown';
      
    const encryption = typeof bucketDetails.encryption === 'boolean'
      ? bucketDetails.encryption.toString()
      : bucketDetails.encryption || 'unknown';
      
    const antivirus = typeof bucketDetails.antivirus === 'boolean'
      ? bucketDetails.antivirus.toString()
      : bucketDetails.antivirus || 'unknown';
    
    // Access properties safely with multiple fallbacks
    return {
      bucketId: fullConfig.storageId,
      bucketName: bucketDetails.name,
      totalFiles: files.total,
      storageUsed,
      storageLimit: 
        bucketDetails.fileSizeLimit || 
        bucketDetails.maximum || 
        bucketDetails.maxSize || 
        (5 * 1024 * 1024 * 1024), // 5GB default
      enabled: bucketDetails.enabled,
      maximumFileSize: 
        bucketDetails.fileSize || 
        bucketDetails.fileSizeLimit || 
        bucketDetails.maxFileSize || 
        (10 * 1024 * 1024), // 10MB default
      allowedFileExtensions: bucketDetails.allowedFileExtensions || [],
      compression,
      encryption,
      antivirus
    };
  } catch (error) {
    console.error('Error getting storage details:', error);
    throw error;
  }
}