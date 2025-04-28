

export interface AppwriteUser {
  // System fields
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  
  // Custom fields
  accountId: string;       // ID from Appwrite auth
  fullName: string;        // User's full name
  email: string;           // User's email
  department?: string;     // User's department
  role: 'admin' | 'user' | 'manager';  // User's role
  status: 'active' | 'inactive' | 'suspended'; // User's status
  avatar?: string;         // URL to user's avatar
  needsProfileCompletion?: boolean; // Whether the user needs to complete their profile
}

export interface AppwriteFile {
  // System fields
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  
  // Custom fields
  name: string;            // File name
  type: 'image' | 'document' | 'video' | 'audio' | 'other'; // File type/category
  extension: string;       // File extension
  size: number;            // File size in bytes
  url: string;             // File URL
  ownerId: string;         // Owner's user ID
  departmentId?: string;   // Department ID if applicable
  sharedWith: string[];    // Array of user IDs with access
  bucketFileId: string;    // Appwrite Storage file ID
  status: 'active' | 'archived' | 'deleted'; // File status
  tags?: string[];         // Array of tags
}

export interface AppwriteActivityLog {
  // System fields
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  
  // Custom fields
  userId: string;          // User ID who performed the action
  action: string;          // Action type (e.g., FILE_UPLOAD, USER_LOGIN)
  details: string;         // Description of the activity
  fileId?: string;         // Related file ID if applicable
  metadata?: any;          // Additional metadata
}

export interface AppwriteDepartment {
  // System fields
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  
  // Custom fields
  name: string;              // Department name
  description?: string;      // Department description
  allocatedStorage: number;  // Storage allocation in bytes
  members: string[];         // Array of user IDs
}

export interface AppwriteOcrResult {
  // System fields
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  
  // Custom fields
  fileId: string;          // Reference to original file
  text: string;            // Extracted text
  confidence: number;      // OCR confidence score
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;          // Error message if failed
  metadata?: string;       // Additional metadata as JSON string
}

export interface AppwriteDocumentTag {
  // System fields
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  
  // Custom fields
  fileId: string;          
  tag: string;             
  category: string;        
  confidence: number;      
  source: 'manual' | 'ai' | 'system';
  userId?: string;         
}

// Action types for activity logs
export enum ActivityAction {
  FILE_UPLOAD = 'FILE_UPLOAD',
  FILE_DOWNLOAD = 'FILE_DOWNLOAD',
  FILE_DELETE = 'FILE_DELETE',
  FILE_SHARE = 'FILE_SHARE',
  FILE_RENAME = 'FILE_RENAME',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE'
}

/**
 * Collection names for Appwrite
 */
export const Collections = {
  USERS: 'users',
  FILES: 'files',
  ACTIVITY_LOGS: 'activity_logs',
  DEPARTMENT_REGISTRY: 'department_registry'
};

/**
 * Example Appwrite collection creation instructions
 * 
 * Users Collection:
 * - Required attributes: 
 *   - accountId (string, required, indexed)
 *   - fullName (string, required)
 *   - email (string, required, indexed)
 *   - role (string, required, default: "user")
 *   - status (string, required, default: "active")
 *   - createdAt (string, required)
 *   - updatedAt (string, required)
 * - Optional attributes:
 *   - department (string)
 *   - avatar (string)
 *   - needsProfileCompletion (boolean)
 * 
 * Files Collection:
 * - Required attributes:
 *   - bucketId (string, required)
 *   - fileId (string, required, indexed)
 *   - name (string, required, indexed)
 *   - size (number, required)
 *   - type (string, required, indexed)
 *   - mimeType (string, required)
 *   - extension (string, required, indexed)
 *   - ownerId (string, required, indexed)
 *   - ownerName (string, required)
 *   - ownerEmail (string, required)
 *   - isPublic (boolean, required, default: false)
 *   - sharedWith (string[], required, default: [])
 *   - status (string, required, default: "active")
 * - Optional attributes:
 *   - departmentId (string, indexed)
 *   - tags (string[])
 *   - description (string)
 *   - thumbnailUrl (string)
 * 
 * Activity Logs Collection:
 * - Required attributes:
 *   - type (string, required, indexed)
 *   - userId (string, required, indexed)
 *   - userEmail (string, required)
 *   - userName (string, required)
 *   - description (string, required)
 *   - createdAt (string, required)
 * - Optional attributes:
 *   - fileId (string, indexed)
 *   - fileName (string)
 *   - ipAddress (string)
 *   - userAgent (string)
 */

export interface AppwriteUserSettings {
  // System fields
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  
  // Custom fields
  userId: string;           // Reference to user
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    emailNotifications: boolean;
  };
}

export interface AppwriteAppSettings {
  // System fields
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  
  // Custom fields
  key: string;              // Setting key
  value: any;               // Setting value
  description?: string;     // Setting description
} 