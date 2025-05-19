
"use server";

import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { InputFile } from "node-appwrite/file";
import { fullConfig } from "@/lib/appwrite/config";
import { ID, Models, Query } from "node-appwrite";
import { constructFileUrl, getFileType, parseStringify } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/actions/user.actions";



type FileType = "image" | "document" | "video" | "audio" | "other";



interface UploadFileProps {
  file: File;
  ownerId: string;
  accountId?: string;
  path: string;
  departmentId?: string;
}

interface GetFilesProps {
  types?: string[];
  searchText?: string;
  sort?: string;
  limit?: number;
  status?: string;
}

interface RenameFileProps {
  fileId: string;
  newName: string;
  path: string;
}
interface RenameFileResponse {
  success: boolean;
  file?: any;
  error?: string;
}


interface UpdateFileUsersProps {
  fileId: string;
  emails: string[];
  path: string;
}

interface DeleteFileProps {
  fileId: string;
  bucketFileId: string;
  path: string;
}

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const uploadFile = async ({
  file,
  ownerId,
  departmentId,
  accountId,
  path,
}: UploadFileProps) => {
  const { storage, databases } = await createAdminClient();

  try {
    // Convert file to buffer before creating InputFile
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Ensure buffer is not empty
    if (buffer.length === 0) {
      throw new Error("File buffer is empty");
    }
    
    const inputFile = InputFile.fromBuffer(buffer, file.name);

    const bucketFile = await storage.createFile(
      fullConfig.storageId,
      ID.unique(),
      inputFile
    );

    const fileDocument = {
      type: getFileType(bucketFile.name).type,
      name: bucketFile.name,
      url: constructFileUrl(bucketFile.$id),
      extension: getFileType(bucketFile.name).extension,
      size: bucketFile.sizeOriginal,
      ownerId: ownerId,
      // Add department ID if provided
      ...(departmentId && { departmentId }),
      sharedWith: [],
      bucketFieldId: bucketFile.$id,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newFile = await databases
      .createDocument(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        ID.unique(),
        fileDocument,
      )
      .catch(async (error: unknown) => {
        await storage.deleteFile(fullConfig.storageId, bucketFile.$id);
        handleError(error, "Failed to create file document");
      });

    revalidatePath(path);
    return parseStringify(newFile);
  } catch (error) {
    handleError(error, "Failed to upload file");
  }
};

const createQueries = (
  currentUser: Models.Document,
  types: string[],
  searchText: string,
  sort: string,
  limit?: number,
  status?: string,
) => {
  const queries = [
    Query.or([
      Query.equal("ownerId", [currentUser.$id]),
      Query.contains("sharedWith", [currentUser.$id]),
    ]),
  ];

  if (types.length > 0) queries.push(Query.equal("type", types));
  if (searchText) queries.push(Query.contains("name", searchText));
  if (limit) queries.push(Query.limit(limit));

  if (sort) {
    const [sortBy, orderBy] = sort.split("-");

    queries.push(
      orderBy === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy),
    );
  }

  if (status) queries.push(Query.equal("status", status));

  return queries;
};

export const getFiles = async ({
  types = [],
  searchText = "",
  sort = "$createdAt-desc",
  limit,
  status = "active",
}: GetFilesProps) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) throw new Error("User not found");

    const queries = createQueries(currentUser, types, searchText, sort, limit, status);

    const files = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      queries,
    );

    console.log({ files });
    return parseStringify(files);
  } catch (error) {
    handleError(error, "Failed to get files");
  }
};

// Utility functions for file name handling (moved inside the main function)
const sanitizeFileName = (fileName: string): string => {
  // Remove or replace invalid characters
  const sanitized = fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing spaces

  // Ensure the name isn't too long (most filesystems support up to 255 characters)
  const maxLength = 250; // Leave some room for extension
  return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
};

// Extract file extension from filename
const extractFileExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return ''; // No extension or hidden file
  }
  return fileName.substring(lastDotIndex + 1).toLowerCase();
};

// Ensure the file name has the correct extension
const ensureFileExtension = (baseName: string, originalExtension: string): string => {
  if (!originalExtension) {
    return baseName;
  }

  const baseNameLower = baseName.toLowerCase();
  const extensionLower = originalExtension.toLowerCase();

  // Check if the new name already has the correct extension
  if (baseNameLower.endsWith(`.${extensionLower}`)) {
    return baseName;
  }

  // Check if the new name has a different extension
  const lastDotIndex = baseName.lastIndexOf('.');
  if (lastDotIndex > 0) {
    // Replace the existing extension with the original one
    const nameWithoutExtension = baseName.substring(0, lastDotIndex);
    return `${nameWithoutExtension}.${originalExtension}`;
  }

  // Add the original extension
  return `${baseName}.${originalExtension}`;
};

export const renameFile = async ({
  fileId,
  newName,
  path,
}: RenameFileProps): Promise<RenameFileResponse> => {
  const { databases } = await createAdminClient();

  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Validate inputs
    if (!fileId) {
      throw new Error("File ID is required");
    }

    if (!newName || newName.trim().length === 0) {
      throw new Error("New file name is required");
    }

    // Sanitize the new name
    const sanitizedName = sanitizeFileName(newName.trim());
    if (!sanitizedName) {
      throw new Error("Invalid file name");
    }

    // Get the current file to check permissions and get extension
    const currentFile = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );

    // Check if user has permission to rename this file
    const hasPermission = 
      currentFile.ownerId === currentUser.$id || 
      currentUser.role === 'admin' ||
      (currentFile.sharedWith && currentFile.sharedWith.includes(currentUser.$id));

    if (!hasPermission) {
      throw new Error("You don't have permission to rename this file");
    }

    // Extract current extension from the file name
    const currentExtension = extractFileExtension(currentFile.name);
    
    // Create the final name with proper extension
    const finalName = ensureFileExtension(sanitizedName, currentExtension);

    // Check if the new name is different from current name
    if (finalName === currentFile.name) {
      return {
        success: true,
        file: parseStringify(currentFile),
      };
    }

    // Update the file document
    const updatedFile = await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId,
      {
        name: finalName,
        updatedAt: new Date().toISOString(),
      }
    );

    // Revalidate the path to refresh the UI
    revalidatePath(path);

    return {
      success: true,
      file: parseStringify(updatedFile),
    };
  } catch (error: any) {
    console.error("Error renaming file:", error);
    return {
      success: false,
      error: error.message || "Failed to rename file",
    };
  }
};

export const renameMultipleFiles = async (
  files: Array<{ fileId: string; newName: string }>,
  path: string
): Promise<{ success: boolean; results: Array<{ fileId: string; success: boolean; error?: string }> }> => {
  const results = [];

  for (const file of files) {
    try {
      const result = await renameFile({
        fileId: file.fileId,
        newName: file.newName,
        path,
      });

      results.push({
        fileId: file.fileId,
        success: result.success,
        error: result.error,
      });
    } catch (error: any) {
      results.push({
        fileId: file.fileId,
        success: false,
        error: error.message || "Failed to rename file",
      });
    }
  }

  // Check if all operations were successful
  const allSuccessful = results.every(result => result.success);

  return {
    success: allSuccessful,
    results,
  };
};

/**
 * Validate if a file name is valid
 */
export const validateFileName = async (fileName: string): Promise<{ isValid: boolean; error?: string }> => {
  if (!fileName || fileName.trim().length === 0) {
    return { isValid: false, error: "File name cannot be empty" };
  }

  const sanitized = sanitizeFileName(fileName);
  if (!sanitized) {
    return { isValid: false, error: "File name contains only invalid characters" };
  }

  if (sanitized.length > 250) {
    return { isValid: false, error: "File name is too long (maximum 250 characters)" };
  }

  // Check for reserved names (Windows)
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];

  const nameWithoutExtension = sanitized.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExtension)) {
    return { isValid: false, error: "File name is reserved by the system" };
  }

  return { isValid: true };
};

/**
 * Get suggested file names when there's a conflict
 */
export const getSuggestedFileNames = async (originalName: string, existingNames: string[]): Promise<string[]> => {
  const suggestions = [];
  const extension = extractFileExtension(originalName);
  const baseName = originalName.replace(`.${extension}`, '');

  // Try adding numbers
  for (let i = 1; i <= 10; i++) {
    const suggestion = extension 
      ? `${baseName} (${i}).${extension}`
      : `${baseName} (${i})`;
    
    if (!existingNames.includes(suggestion)) {
      suggestions.push(suggestion);
    }
  }

  // Try adding timestamp
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:.]/g, '-');
  const timestampSuggestion = extension
    ? `${baseName} ${timestamp}.${extension}`
    : `${baseName} ${timestamp}`;
  
  if (!existingNames.includes(timestampSuggestion)) {
    suggestions.push(timestampSuggestion);
  }

  return suggestions.slice(0, 5); // Return up to 5 suggestions
};

export const updateFileUsers = async ({
  fileId,
  emails,
  path,
}: UpdateFileUsersProps) => {
  try {
    console.log('Starting file sharing process', { fileId, emails });
    
    // Create fresh admin client for this operation
    const { databases } = await createAdminClient();
    
    // First get the current file to check existing sharedWith
    const existingFile = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    console.log('Existing file data:', {
      id: existingFile.$id,
      name: existingFile.name,
      currentSharedWith: existingFile.sharedWith || []
    });
    
    // Ensure emails array is valid
    const validEmails = Array.isArray(emails) ? emails : [];
    console.log('Updating sharedWith to:', validEmails);
    
    // Update the document with the new sharedWith array
    const updatedFile = await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId,
      {
        sharedWith: validEmails,
        updatedAt: new Date().toISOString(),
      }
    );
    
    console.log('File sharing updated successfully');
    
    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error: any) {
    console.error("Error updating file sharing:", error.message, error.code, error.type);
    handleError(error, "Failed to update file sharing");
  }
};

export const deleteFile = async ({
  fileId,
  bucketFileId,
  path,
}: DeleteFileProps) => {
  try {
    console.log('Starting file deletion process', { fileId, bucketFileId, path });
    
    // Create fresh admin client for this operation
    const { databases, storage } = await createAdminClient();

    // First check if the document exists
    try {
      console.log('Checking if file document exists...');
      const fileDoc = await databases.getDocument(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        fileId
      );
      console.log('File document found:', fileDoc.$id);

      // Document exists, delete it
      console.log('Deleting file document...');
      await databases.deleteDocument(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        fileId
      );
      console.log('File document deleted successfully');
    } catch (docError: any) {
      console.log('Document error:', docError.message, docError.code);
      
      if (docError.code === 404) {
        console.log(`File document ${fileId} not found`);
      } else {
        throw docError; // Re-throw if it's not a 404 error
      }
    }

    // Then delete the storage file
    try {
      if (bucketFileId) {
        console.log('Deleting storage file...', bucketFileId);
        await storage.deleteFile(fullConfig.storageId, bucketFileId);
        console.log('Storage file deleted successfully');
      } else {
        console.log('No bucketFileId provided, skipping storage file deletion');
      }
    } catch (storageError: any) {
      console.error("Storage file deletion failed:", storageError.message, storageError.code);
      // Continue even if storage deletion fails, as we've already deleted the document
    }

    revalidatePath(path);
    return parseStringify({ status: "success" });
  } catch (error: any) {
    console.error("Error deleting file:", error.message, error.code, error.type);
    handleError(error, "Failed to delete file");
  }
};

// ============================== TOTAL FILE SPACE USED
export async function getTotalSpaceUsed() {
  try {
    const sessionClient = await createSessionClient();
    if (!sessionClient) throw new Error("User is not authenticated.");
    
    const { databases } = sessionClient;
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User is not authenticated.");

    const files = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [Query.equal("ownerId", [currentUser.$id])],
    );

    const totalSpace = {
      image: { size: 0, latestDate: "" },
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: 2 * 1024 * 1024 * 1024 /* 2GB available bucket storage */,
    };

    files.documents.forEach((file: any) => {
      const fileType = file.type as FileType;
      totalSpace[fileType].size += file.size;
      totalSpace.used += file.size;

      if (
        !totalSpace[fileType].latestDate ||
        new Date(file.$updatedAt) > new Date(totalSpace[fileType].latestDate)
      ) {
        totalSpace[fileType].latestDate = file.$updatedAt;
      }
    });

    return parseStringify(totalSpace);
  } catch (error) {
    handleError(error, "Error calculating total space used:, ");
  }
}