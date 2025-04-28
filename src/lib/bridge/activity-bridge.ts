import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { ID } from 'node-appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';

// Activity type constants
export const ActivityTypes = {
  FILE_UPLOAD: 'FILE_UPLOAD',
  FILE_DOWNLOAD: 'FILE_DOWNLOAD',
  FILE_VIEW: 'FILE_VIEW',
  FILE_DELETE: 'FILE_DELETE',
  FILE_RESTORE: 'FILE_RESTORE',
  FILE_PERMANENT_DELETE: 'FILE_PERMANENT_DELETE',
  FILE_SHARE: 'FILE_SHARE',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  DEPARTMENT_CREATE: 'DEPARTMENT_CREATE',
  DEPARTMENT_UPDATE: 'DEPARTMENT_UPDATE',
  DEPARTMENT_DELETE: 'DEPARTMENT_DELETE',
};

// Log activity action
export const logActivity = async (
  action: string, 
  details: string, 
  fileId?: string,
  departmentId?: string,
  metadata?: any
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User not authenticated");
    
    const { databases } = await createAdminClient();
    
    const activityData = {
      userId: currentUser.$id,
      type: action,  // Changed from 'action' to 'type' to match schema
      description: details, // Changed from 'details' to 'description' to match schema
      fileId: fileId || null,
      departmentId: departmentId || null,
      createdAt: new Date().toISOString(),
      metadata: metadata ? JSON.stringify(metadata) : null
    };
    
    const activity = await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.activityLogsCollectionId,
      ID.unique(),
      activityData
    );
    
    console.log(`Activity logged: ${action} - ${details}`);
    return activity;
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Don't throw here, just log the error to avoid breaking main operations
    return null;
  }
};

// Log file upload
export const logFileUpload = async (fileName: string, fileId: string, departmentId?: string) => {
  const details = departmentId 
    ? `Uploaded file: ${fileName} to department`
    : `Uploaded file: ${fileName}`;
    
  return logActivity(
    ActivityTypes.FILE_UPLOAD,
    details,
    fileId,
    departmentId
  );
};

// Log file download
export const logFileDownload = async (fileName: string, fileId: string, departmentId?: string) => {
  return logActivity(
    ActivityTypes.FILE_DOWNLOAD,
    `Downloaded file: ${fileName}`,
    fileId,
    departmentId
  );
};

// Log file view
export const logFileView = async (fileName: string, fileId: string) => {
  return logActivity(
    ActivityTypes.FILE_VIEW,
    `Viewed file: ${fileName}`,
    fileId
  );
};

// Log file delete (soft delete - move to trash)
export const logFileDelete = async (fileName: string, fileId: string) => {
  return logActivity(
    ActivityTypes.FILE_DELETE,
    `Deleted file: ${fileName} (moved to trash)`,
    fileId
  );
};

// Log file restore
export const logFileRestore = async (fileName: string, fileId: string) => {
  return logActivity(
    ActivityTypes.FILE_RESTORE,
    `Restored file: ${fileName} from trash`,
    fileId
  );
};

// Log file permanent delete
export const logFilePermanentDelete = async (fileName: string, fileId: string) => {
  return logActivity(
    ActivityTypes.FILE_PERMANENT_DELETE,
    `Permanently deleted file: ${fileName}`,
    fileId
  );
};

// Log file share
export const logFileShare = async (fileName: string, fileId: string, shareWith: string, shareType: 'user' | 'department') => {
  return logActivity(
    ActivityTypes.FILE_SHARE,
    `Shared file: ${fileName} with ${shareType} ${shareWith}`,
    fileId,
    shareType === 'department' ? shareWith : undefined,
    { shareWith, shareType }
  );
};

// Log user login
export const logUserLogin = async () => {
  return logActivity(
    ActivityTypes.USER_LOGIN,
    `User logged in`
  );
};

// Log user logout
export const logUserLogout = async () => {
  return logActivity(
    ActivityTypes.USER_LOGOUT,
    `User logged out`
  );
};

// Log department activities
export const logDepartmentActivity = async (action: string, departmentName: string, departmentId: string) => {
  return logActivity(
    action,
    `${action.replace('DEPARTMENT_', '').toLowerCase()} department: ${departmentName}`,
    undefined,
    departmentId,
    { departmentName }
  );
};

// Get all activities - with optional filtering
export const getAllActivities = async ({
  type = null,
  userId = null,
  fileId = null,
  departmentId = null,
  limit = 20,
  offset = 0
}: {
  type?: string | null;
  userId?: string | null;
  fileId?: string | null;
  departmentId?: string | null;
  limit?: number;
  offset?: number;
}) => {
  try {
    const { databases } = await createAdminClient();
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error("Permission denied - admin only");
    }
    
    const queries = [
      Query.orderDesc('createdAt'),
      Query.limit(limit),
      Query.offset(offset)
    ];
    
    // Add filters
    if (type) {
      queries.push(Query.equal('type', [type]));
    }
    
    if (userId) {
      queries.push(Query.equal('userId', [userId]));
    }
    
    if (fileId) {
      queries.push(Query.equal('fileId', [fileId]));
    }
    
    if (departmentId) {
      queries.push(Query.equal('departmentId', [departmentId]));
    }
    
    const activities = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.activityLogsCollectionId,
      queries
    );
    
    return {
      activities: activities.documents,
      total: activities.total,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(activities.total / limit)
    };
  } catch (error) {
    console.error("Failed to get all activities:", error);
    throw error;
  }
}; 