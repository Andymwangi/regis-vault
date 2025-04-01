import { databases, DATABASES, COLLECTIONS, Query } from './config';

/**
 * Get all files for a specific department
 * @param departmentId The department ID to get files for
 * @returns List of files in the department
 */
export const getDepartmentFiles = async (departmentId: string) => {
  try {
    const result = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.FILES_METADATA,
      [Query.equal('departmentId', departmentId), Query.equal('status', 'active')]
    );
    
    return result.documents;
  } catch (error) {
    console.error('Error getting department files:', error);
    throw error;
  }
};

/**
 * Get all users in a specific department
 * @param departmentId The department ID to get users for
 * @returns List of users in the department
 */
export const getDepartmentUsers = async (departmentId: string) => {
  try {
    const result = await databases.listDocuments(
      DATABASES.MAIN,
      COLLECTIONS.DEPARTMENTS,
      [Query.equal('department', departmentId), Query.equal('status', 'active')]
    );
    
    return result.documents;
  } catch (error) {
    console.error('Error getting department users:', error);
    throw error;
  }
};

/**
 * Get file usage statistics for a department
 * @param departmentId The department ID to get statistics for
 * @returns Object containing usage statistics
 */
export const getDepartmentStats = async (departmentId: string) => {
  try {
    // Get all files for department
    const files = await getDepartmentFiles(departmentId);
    
    // Calculate total storage used
    const totalStorageBytes = files.reduce((total, file) => total + file.size, 0);
    const totalStorageMB = totalStorageBytes / (1024 * 1024);
    
    // Count files by type
    const fileTypeCount = files.reduce((counts: Record<string, number>, file) => {
      const type = file.type.split('/')[1] || 'other';
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});
    
    // Get user count
    const users = await getDepartmentUsers(departmentId);
    
    return {
      totalFiles: files.length,
      totalUsers: users.length,
      totalStorageBytes,
      totalStorageMB,
      fileTypeCount
    };
  } catch (error) {
    console.error('Error getting department stats:', error);
    throw error;
  }
};

/**
 * Share a file with a specific department
 * @param fileId The file ID to share
 * @param departmentId The department ID to share with
 * @returns The updated file metadata
 */
export const shareFileWithDepartment = async (fileId: string, departmentId: string) => {
  try {
    // Update the file's department ID
    const updatedFile = await databases.updateDocument(
      DATABASES.MAIN,
      COLLECTIONS.FILES_METADATA,
      fileId,
      {
        departmentId: departmentId,
        updatedAt: new Date().toISOString()
      }
    );
    
    return updatedFile;
  } catch (error) {
    console.error('Error sharing file with department:', error);
    throw error;
  }
}; 