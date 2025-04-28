import { fullConfig } from "@/lib/appwrite/config";
import { createAdminClient } from "@/lib/appwrite";
import { ID } from "node-appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { logFileUpload } from "@/lib/bridge/activity-bridge";

interface UploadFileParams {
  file: File;
  ownerId: string;
  departmentId?: string;
  path?: string;
}

/**
 * Enhanced file upload service that supports department-based file uploads
 */
export const uploadFile = async ({
  file,
  ownerId,
  departmentId,
  path = "/dashboard/files"
}: UploadFileParams) => {
  try {
    const { storage, databases } = await createAdminClient();
    
    console.log(`Starting file upload process for ${file.name}`);
    console.log(`Owner: ${ownerId}, Department: ${departmentId || 'None'}`);
    
    // Upload file to storage
    const storageFile = await storage.createFile(
      fullConfig.storageId,
      ID.unique(),
      file
    );
    
    console.log(`File uploaded to storage with ID: ${storageFile.$id}`);
    
    // Determine file type based on MIME type
    const fileType = determineFileType(file.type);
    
    // Create a document in files collection to track the file
    const fileDocument = await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      ID.unique(),
      {
        name: file.name,
        size: file.size,
        type: fileType,
        mimeType: file.type,
        bucketFileId: storageFile.$id,
        ownerId,
        departmentId: departmentId || null,
        path,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
    
    console.log(`File document created in database with ID: ${fileDocument.$id}`);
    
    // Log the activity
    await logFileUpload(file.name, fileDocument.$id, departmentId);
    
    return fileDocument;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

/**
 * Upload multiple files to a department
 */
export const uploadFilesToDepartment = async (
  files: File[],
  departmentId: string
) => {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      throw new Error("User not authenticated");
    }
    
    const results = [];
    
    for (const file of files) {
      const result = await uploadFile({
        file,
        ownerId: currentUser.$id,
        departmentId,
        path: `/dashboard/departments/${departmentId}`
      });
      
      results.push(result);
    }
    
    return results;
  } catch (error) {
    console.error("Error uploading files to department:", error);
    throw error;
  }
};

/**
 * Get user's departments for file upload
 */
export const getUserDepartments = async () => {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      throw new Error("User not authenticated");
    }
    
    const { databases } = await createAdminClient();
    
    // This assumes you have a way to track user-department relationships
    // You might need to adjust this query based on your schema
    const userDepartments = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      []
    );
    
    return userDepartments.documents;
  } catch (error) {
    console.error("Error getting user departments:", error);
    throw error;
  }
};

// Helper function to determine file type from MIME type
function determineFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType.startsWith('video/')) {
    return 'video';
  } else if (mimeType.startsWith('audio/')) {
    return 'audio';
  } else if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/msword' ||
    mimeType.includes('document') ||
    mimeType.includes('text/') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  ) {
    return 'document';
  } else {
    return 'other';
  }
} 