"use server";

import { createAdminClient } from './index';
import { ID, Query } from 'node-appwrite';
import { fullConfig } from './config';
import { getCurrentUser } from './user-operations';

// Define activity types enum
export const ActivityTypes = {
  FILE_UPLOAD: 'FILE_UPLOAD',
  FILE_DOWNLOAD: 'FILE_DOWNLOAD',
  FILE_DELETE: 'FILE_DELETE',
  FILE_RENAME: 'FILE_RENAME',
  FILE_SHARE: 'FILE_SHARE',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_UPDATE: 'USER_UPDATE',
  ADMIN_ACTION: 'ADMIN_ACTION'
};

// Log an activity
export async function logActivity(
  action: string,
  details: string,
  fileId?: string
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User not authenticated");
    
    const { databases } = await createAdminClient();
    
    const activityData = {
      userId: currentUser.$id,
      action,
      details,
      fileId: fileId || null,
      createdAt: new Date().toISOString()
    };
    
    const activity = await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.activityLogsCollectionId,
      ID.unique(),
      activityData
    );
    
    return activity;
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Don't throw here to avoid breaking main operations
    return null;
  }
}

// Log file upload
export async function logFileUpload(fileName: string, fileId: string) {
  return logActivity(
    ActivityTypes.FILE_UPLOAD,
    `Uploaded file: ${fileName}`,
    fileId
  );
}

// Log file download
export async function logFileDownload(fileName: string, fileId: string) {
  return logActivity(
    ActivityTypes.FILE_DOWNLOAD,
    `Downloaded file: ${fileName}`,
    fileId
  );
}

// Log file deletion
export async function logFileDelete(fileName: string, fileId: string) {
  return logActivity(
    ActivityTypes.FILE_DELETE,
    `Deleted file: ${fileName}`,
    fileId
  );
}

// Log file rename
export async function logFileRename(oldName: string, newName: string, fileId: string) {
  return logActivity(
    ActivityTypes.FILE_RENAME,
    `Renamed file from "${oldName}" to "${newName}"`,
    fileId
  );
}

// Log file share
export async function logFileShare(fileName: string, sharedWith: string[], fileId: string) {
  return logActivity(
    ActivityTypes.FILE_SHARE,
    `Shared file "${fileName}" with ${sharedWith.length} user(s)`,
    fileId
  );
}

// Log user login
export async function logUserLogin() {
  return logActivity(
    ActivityTypes.USER_LOGIN,
    "User logged in"
  );
}

// Log user logout
export async function logUserLogout() {
  return logActivity(
    ActivityTypes.USER_LOGOUT,
    "User logged out"
  );
}

// Get user activities
export async function getUserActivities(
  userId: string,
  limit = 20,
  offset = 0
) {
  try {
    const { databases } = await createAdminClient();
    const currentUser = await getCurrentUser();
    
    // Only admins can view other users' activities
    if (currentUser?.$id !== userId && currentUser?.role !== 'admin') {
      throw new Error("Permission denied");
    }
    
    const activities = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.activityLogsCollectionId,
      [
        Query.equal('userId', [userId]),
        Query.orderDesc('createdAt'),
        Query.limit(limit),
        Query.offset(offset)
      ]
    );
    
    return {
      activities: activities.documents,
      total: activities.total,
      limit,
      offset
    };
  } catch (error) {
    console.error("Failed to get user activities:", error);
    throw error;
  }
}

// Get file activities
export async function getFileActivities(
  fileId: string,
  limit = 20,
  offset = 0
) {
  try {
    const { databases } = await createAdminClient();
    const currentUser = await getCurrentUser();
    
    if (!currentUser) throw new Error("User not authenticated");
    
    // Get the file to check permissions
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    // Check if user has access to the file
    const hasAccess = 
      file.ownerId === currentUser.$id || 
      file.sharedWith?.includes(currentUser.$id) ||
      currentUser.role === 'admin';
    
    if (!hasAccess) {
      throw new Error("Permission denied");
    }
    
    const activities = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.activityLogsCollectionId,
      [
        Query.equal('fileId', [fileId]),
        Query.orderDesc('createdAt'),
        Query.limit(limit),
        Query.offset(offset)
      ]
    );
    
    return {
      activities: activities.documents,
      total: activities.total,
      limit,
      offset
    };
  } catch (error) {
    console.error("Failed to get file activities:", error);
    throw error;
  }
}

// Get all activity logs (admin only)
export async function getAllActivities({
  type = null,
  userId = null,
  fileId = null,
  limit = 20,
  offset = 0
}: {
  type?: string | null;
  userId?: string | null;
  fileId?: string | null;
  limit?: number;
  offset?: number;
}) {
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
      queries.push(Query.equal('action', [type]));
    }
    
    if (userId) {
      queries.push(Query.equal('userId', [userId]));
    }
    
    if (fileId) {
      queries.push(Query.equal('fileId', [fileId]));
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
} 