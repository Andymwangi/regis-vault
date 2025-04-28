import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { Query, Models } from 'node-appwrite';

export interface UserProfile {
  $id: string;
  email: string;
  fullName: string;
  department?: string;
  role?: string;
  status?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  try {
    const { databases } = await createAdminClient();
    
    const users = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.equal('email', [email])]
    );
    
    if (users.total === 0) {
      return null;
    }
    
    const userDoc = users.documents[0];
    return {
      $id: userDoc.$id,
      email: userDoc.email,
      fullName: userDoc.fullName,
      department: userDoc.department,
      role: userDoc.role,
      status: userDoc.status,
      avatar: userDoc.avatar,
      createdAt: userDoc.$createdAt,
      updatedAt: userDoc.$updatedAt
    };
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
} 