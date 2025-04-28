import { getFiles as getFilesService, uploadFile, renameFile, updateFileUsers } from '@/lib/actions/file.actions';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { deleteFiles as deleteFilesService } from '@/lib/services/fileService';

// This function converts Appwrite document format to your existing format
export const convertAppwriteToExistingFormat = (file: any) => {
  return {
    id: file.$id,
    name: file.name,
    type: file.type,
    size: file.size,
    url: file.url,
    thumbnailUrl: file.thumbnailUrl || null,
    ownerId: file.ownerId,
    departmentId: file.departmentId || null,
    status: file.status || 'active',
    createdAt: file.$createdAt,
    updatedAt: file.$updatedAt,
    owner: {
      id: file.ownerId,
      name: file.ownerName || "Unknown",
    },
    bucketFileId: file.bucketFileId || file.bucketFieldId,
    bucketFieldId: file.bucketFieldId || file.bucketFileId,
    ext: file.extension,
    isShared: file.isShared || false
  };
};

// Convert the format expected by the UI to the format expected by Appwrite
export const convertUIFormatToAppwrite = (file: any) => {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    ownerId: file.ownerId,
    departmentId: file.departmentId,
    status: file.status || 'active',
    sharedWith: file.sharedWith || [],
  };
};

// Wrapper function for getFiles that converts results to the expected format
export const getFiles = async (params: any) => {
  try {
    console.log('Getting files with params:', params);
    
    // For shared files, call the dedicated API endpoint
    if (params.type === 'shared') {
      console.log('Fetching shared files from dedicated endpoint');
      const response = await fetch('/api/files/shared');
      
      if (!response.ok) {
        console.error('Error fetching shared files:', response.statusText);
        return { files: [], total: 0 };
      }
      
      const sharedFiles = await response.json();
      console.log('Shared files response:', { count: sharedFiles.length, files: sharedFiles });
      
      // Convert to expected format
      const files = sharedFiles.map((file: any) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        url: file.url,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt || file.createdAt,
        owner: file.owner,
        departmentId: file.department?.id,
        department: file.department,
        bucketFileId: file.bucketFileId,
        isShared: true 
      }));
      
      return {
        files,
        total: files.length,
        page: params.page || 1,
        limit: params.limit || 10,
        totalPages: Math.ceil(files.length / (params.limit || 10))
      };
    }
    
    // For other file types, use the regular getFilesService
    const appwriteFiles = await getFilesService({
      types: params.type && params.type !== "all" ? [params.type] : [],
      searchText: params.search || "",
      sort: params.sort || "$createdAt-desc",
      limit: params.limit || 10,
      // Explicitly request only active files (not deleted)
      status: "active"
    });
    
    if (!appwriteFiles) return { files: [], total: 0 };
    
    const files = appwriteFiles.documents.map(convertAppwriteToExistingFormat);
    
    return {
      files,
      total: appwriteFiles.total,
      page: params.page || 1,
      limit: params.limit || 10,
      totalPages: Math.ceil(appwriteFiles.total / (params.limit || 10))
    };
  } catch (error) {
    console.error('Error in getFiles:', error);
    return { files: [], total: 0 };
  }
};

// Upload file wrapper
export const uploadFileBridge = async (file: File, path: string = "/dashboard/files") => {
  console.log('Starting uploadFileBridge for file:', file.name);
  console.log('Environment check:', {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ? 'defined' : 'undefined',
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT ? 'defined' : 'undefined',
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE ? 'defined' : 'undefined',
    apiKey: process.env.APPWRITE_API_KEY ? 'defined' : 'undefined'
  }); 
    try {
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        console.error('Authentication error: User not authenticated');
        throw new Error("User is not authenticated");
      }
      
      // Extract departmentId from path if it's a team upload
      let departmentId = undefined;
      if (path.includes('/teams/')) {
        departmentId = path.split('/teams/')[1];
      }
      
      console.log('User authenticated:', currentUser.$id, 'Department:', departmentId);
      
      const result = await uploadFile({
        file,
        ownerId: currentUser.$id,
        departmentId, // Pass the extracted departmentId
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
      throw error;
    }
  };

// Delete file wrapper
export const deleteFileBridge = async (fileId: string, bucketFileId?: string) => {
  try {
    if (!fileId) {
      throw new Error("Missing file ID");
    }
    
    // Get current user ID to track who deleted the file
    const userResponse = await fetch('/api/user/profile');
    let userId = undefined;
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      userId = userData.user?.$id || userData.user?.id;
    }
    
    const result = await deleteFilesService([fileId], userId);
    
    if (!result || !result.success) {
      throw new Error("File deletion failed");
    }
    
    return result;
  } catch (error) {
    console.error("Error in deleteFileBridge:", error);
    throw error;
  }
};

// Rename file wrapper
export const renameFileBridge = async (fileId: string, name: string, extension: string, path: string = "/dashboard/files") => {
  const result = await renameFile({
    fileId,
    name,
    extension,
    path
  });
  
  if (!result) throw new Error("Failed to rename file");
  
  return convertAppwriteToExistingFormat(result);
};

// Share file wrapper - enhanced to support both email and department sharing
export const shareFileBridge = async (
  fileId: string, 
  options: {
    emails?: string[];
    users?: string[];
    departments?: string[];
    role?: 'viewer' | 'editor' | 'admin';
    shareAsDepartment?: boolean;
  }
) => {
  try {
    const response = await fetch(`/api/files/${fileId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to share file');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sharing file:', error);
    throw error;
  }
};

// Backwards compatibility helper for the old interface
export const shareFileByEmail = async (fileId: string, emails: string[]) => {
  return shareFileBridge(fileId, { emails });
};

// Download file wrapper
export const downloadFileBridge = async (fileId: string) => {
  try {
    const response = await fetch(`/api/files/${fileId}/download`);
    if (!response.ok) {
      throw new Error('Failed to download file');
    }
    return response;
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}; 