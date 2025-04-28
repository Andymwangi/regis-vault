import { databases, fullConfig } from "@/lib/appwrite/config";

/**
 * Check if a user has a specific permission/role
 * @param userId The user ID to check permissions for
 * @param role The role to check ('admin', 'manager', etc.)
 * @returns Promise<boolean> True if the user has the specified role
 */
export async function checkUserPermission(userId: string, role: string): Promise<boolean> {
  try {
    // Fetch the user document
    const user = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId
    );
    
    // Check if user has the specified role
    return user.role === role;
  } catch (error) {
    console.error('Error checking user permissions:', error);
    return false;
  }
} 