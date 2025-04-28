"use server";

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from './index';
import { fullConfig } from './config';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { AppwriteUser, AppwriteFile } from './schema';

// Get all users (admin only)
export async function getAllUsers(
  search: string = '',
  role: string = '',
  limit: number = 50,
  offset: number = 0
) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  if (currentUser.role !== 'admin') throw new Error("Permission denied");
  
  try {
    const queries = [
      Query.limit(limit),
      Query.offset(offset)
    ];
    
    // Add role filter if specified
    if (role) {
      queries.push(Query.equal('role', [role]));
    }
    
    // Add search if provided
    if (search) {
      queries.push(Query.search('fullName', search));
    }
    
    const users = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      queries
    );
    
    return {
      users: users.documents as AppwriteUser[],
      total: users.total,
      limit,
      offset
    };
  } catch (error) {
    console.error('Error getting users:', error);
    throw new Error('Failed to get users');
  }
}

// Update user role (admin only)
export async function updateUserRole(
  userId: string,
  role: 'admin' | 'user' | 'manager',
  path: string = '/dashboard/admin/users'
) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  if (currentUser.role !== 'admin') throw new Error("Permission denied");
  
  try {
    const user = await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId,
      { role }
    );
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return user as AppwriteUser;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new Error('Failed to update user role');
  }
}

// Update user status (admin only)
export async function updateUserStatus(
  userId: string,
  status: 'active' | 'inactive' | 'suspended',
  path: string = '/dashboard/admin/users'
) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  if (currentUser.role !== 'admin') throw new Error("Permission denied");
  
  try {
    const user = await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId,
      { status }
    );
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return user as AppwriteUser;
  } catch (error) {
    console.error('Error updating user status:', error);
    throw new Error('Failed to update user status');
  }
}

// Delete user (admin only)
export async function deleteUser(
  userId: string,
  path: string = '/dashboard/admin/users'
) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  if (currentUser.role !== 'admin') throw new Error("Permission denied");
  
  try {
    // Delete the user document
    await databases.deleteDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId
    );
    
    // Note: This doesn't delete the actual Appwrite account
    // For complete deletion you would need to use the account.deleteUser() 
    // which requires a function with API key access
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
}

// Get all files (admin only)
export async function getAllFiles(
  search: string = '',
  type: string = '',
  status: string = 'active',
  limit: number = 50,
  offset: number = 0
) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  if (currentUser.role !== 'admin') throw new Error("Permission denied");
  
  try {
    const queries = [
      Query.limit(limit),
      Query.offset(offset)
    ];
    
    // Add status filter
    if (status) {
      queries.push(Query.equal('status', [status]));
    }
    
    // Add type filter
    if (type) {
      queries.push(Query.equal('type', [type]));
    }
    
    // Add search if provided
    if (search) {
      queries.push(Query.search('name', search));
    }
    
    const files = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      queries
    );
    
    return {
      files: files.documents as AppwriteFile[],
      total: files.total,
      limit,
      offset
    };
  } catch (error) {
    console.error('Error getting files:', error);
    throw new Error('Failed to get files');
  }
}

// Get system statistics (admin only)
export async function getSystemStats() {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  if (currentUser.role !== 'admin') throw new Error("Permission denied");
  
  try {
    // Get user counts
    const users = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.limit(0)]
    );
    
    // Get file counts and sizes by type
    const fileTypes = ['document', 'image', 'video', 'audio', 'other'];
    const fileStats = [];
    
    for (const type of fileTypes) {
      const files = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.filesCollectionId,
        [
          Query.equal('type', [type]),
          Query.equal('status', ['active']),
          Query.limit(10000)
        ]
      );
      
      const totalSize = files.documents.reduce((sum, file) => sum + (file.size || 0), 0);
      
      fileStats.push({
        type,
        count: files.total,
        size: totalSize
      });
    }
    
    // Get total storage used
    const totalStorage = fileStats.reduce((sum, stat) => sum + stat.size, 0);
    
    return {
      users: {
        total: users.total
      },
      files: {
        stats: fileStats,
        totalCount: fileStats.reduce((sum, stat) => sum + stat.count, 0),
        totalSize: totalStorage
      }
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    throw new Error('Failed to get system stats');
  }
} 