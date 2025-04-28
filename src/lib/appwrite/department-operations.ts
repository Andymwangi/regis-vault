"use server";

import { ID, Query } from 'node-appwrite';
import { createAdminClient, createSessionClient } from './index';
import { fullConfig } from './config';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { AppwriteDepartment } from './schema';

// Create a new department
export async function createDepartment(
  name: string,
  description: string = "",
  allocatedStorage: number = 1024 * 1024 * 1024, // Default 1GB
  path: string = '/dashboard/admin/departments'
) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  if (currentUser.role !== 'admin') throw new Error("Permission denied");
  
  try {
    const departmentData = {
      name,
      description,
      allocatedStorage,
      members: [],
    };
    
    const department = await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId, // You'll need to create this collection
      ID.unique(),
      departmentData
    );
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return department;
  } catch (error) {
    console.error('Error creating department:', error);
    throw new Error('Failed to create department');
  }
}

// Get all departments
export async function getAllDepartments() {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  try {
    try {
      const departments = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.departmentsCollectionId,
        [Query.limit(100)]
      );
      
      return departments.documents as AppwriteDepartment[];
    } catch (error: any) {
      // Handle case where collection doesn't exist yet
      if (error.code === 404 && error.type === 'collection_not_found') {
        console.warn('Departments collection not found. Returning empty array.');
        return [];
      }
      throw error;
    }
  } catch (error) {
    console.error('Error getting departments:', error);
    // Return empty array instead of throwing
    return [];
  }
}

// Get department by ID
export async function getDepartmentById(departmentId: string | any) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  // Handle case where an object is passed instead of a string ID
  if (typeof departmentId === 'object' && departmentId !== null) {
    console.error('Object passed instead of ID string:', departmentId);
    
    // If the object has an $id property, use that instead
    if (departmentId.$id) {
      departmentId = departmentId.$id;
    } else {
      throw new Error('Invalid department ID: expected string but got object');
    }
  }
  
  // Validate department ID format
  if (!departmentId || typeof departmentId !== 'string') {
    console.error('Invalid department ID:', departmentId);
    throw new Error('Invalid department ID format');
  }
  
  // Check for Appwrite ID format requirements
  const validIdRegex = /^[a-zA-Z0-9]{1,36}$/;
  if (!validIdRegex.test(departmentId)) {
    console.error('Department ID format invalid:', departmentId);
    throw new Error('Invalid department ID format');
  }
  
  try {
    const department = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      departmentId
    );
    
    return department as AppwriteDepartment;
  } catch (error) {
    console.error('Error getting department:', error);
    throw new Error('Failed to get department');
  }
}

// Update department
export async function updateDepartment(
  departmentId: string,
  data: Partial<Omit<AppwriteDepartment, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions'>>,
  path: string = '/dashboard/admin/departments'
) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  if (currentUser.role !== 'admin') throw new Error("Permission denied");
  
  try {
    const department = await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      departmentId,
      data
    );
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return department as AppwriteDepartment;
  } catch (error) {
    console.error('Error updating department:', error);
    throw new Error('Failed to update department');
  }
}

// Delete department
export async function deleteDepartment(
  departmentId: string,
  path: string = '/dashboard/admin/departments'
) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  if (currentUser.role !== 'admin') throw new Error("Permission denied");
  
  try {
    await databases.deleteDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      departmentId
    );
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting department:', error);
    throw new Error('Failed to delete department');
  }
}

// Add user to department
export async function addUserToDepartment(
  userId: string,
  departmentId: string,
  path: string = '/dashboard/admin/departments'
) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  if (currentUser.role !== 'admin') throw new Error("Permission denied");
  
  try {
    // Get current department
    const department = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      departmentId
    ) as AppwriteDepartment;
    
    // Add user to members array if not already present
    const members = department.members || [];
    if (!members.includes(userId)) {
      members.push(userId);
    }
    
    // Update department
    const updatedDepartment = await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      departmentId,
      { members }
    );
    
    // Now update user's department field since it exists in the schema
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId,
      { department: departmentId }
    );
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return updatedDepartment as AppwriteDepartment;
  } catch (error) {
    console.error('Error adding user to department:', error);
    throw new Error('Failed to add user to department');
  }
}

// Remove user from department
export async function removeUserFromDepartment(
  userId: string,
  departmentId: string,
  path: string = '/dashboard/admin/departments'
) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  if (currentUser.role !== 'admin') throw new Error("Permission denied");
  
  try {
    // Get current department
    const department = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      departmentId
    ) as AppwriteDepartment;
    
    // Remove user from members array
    const members = (department.members || []).filter(id => id !== userId);
    
    // Update department
    const updatedDepartment = await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      departmentId,
      { members }
    );
    
    // Now update user's department field to null when removed
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId,
      { department: null }
    );
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return updatedDepartment as AppwriteDepartment;
  } catch (error) {
    console.error('Error removing user from department:', error);
    throw new Error('Failed to remove user from department');
  }
}

// Get department storage usage
export async function getDepartmentStorageUsage(departmentId: string) {
  const { databases } = await createAdminClient();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) throw new Error("User not authenticated");
  
  try {
    // Get all files for this department
    const files = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [
        Query.equal('departmentId', [departmentId]),
        Query.equal('status', ['active']),
        Query.limit(10000)
      ]
    );
    
    // Calculate total storage used
    const totalStorage = files.documents.reduce((sum, file) => sum + (file.size || 0), 0);
    
    // Get department for allocated storage
    const department = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      departmentId
    ) as AppwriteDepartment;
    
    return {
      used: totalStorage,
      allocated: department.allocatedStorage || 0,
      available: (department.allocatedStorage || 0) - totalStorage,
      fileCount: files.total
    };
  } catch (error) {
    console.error('Error getting department storage usage:', error);
    throw new Error('Failed to get department storage usage');
  }
} 