"use server";

import { createAdminClient, createSessionClient } from './index';
import { ID, Query } from 'node-appwrite';
import { fullConfig } from './config';
import { revalidatePath } from 'next/cache';
import { setCookie, deleteCookie } from './cookie-utils';
import { redirect } from 'next/navigation';
import { avatarPlaceholderUrl } from '@/constants';

// Define user type
interface AppwriteUser {
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  fullName: string;
  email: string;
  avatar: string;
  accountId: string;
  department: string;
  role: string;
  status: string;
  needsProfileCompletion?: boolean;
}

// Get current authenticated user
export async function getCurrentUser(): Promise<AppwriteUser | null> {
  try {
    const sessionClient = await createSessionClient();
    if (!sessionClient) return null;
    
    const { account, databases } = sessionClient;
    const accountInfo = await account.get();
    
    const userDocs = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.equal('accountId', [accountInfo.$id])]
    );
    
    if (userDocs.total === 0) return null;
    
    const userData = userDocs.documents[0] as AppwriteUser;
    
    // Add a flag for profile completion
    const needsProfileCompletion = !userData.department || !userData.role;
    
    return {
      ...userData,
      needsProfileCompletion
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Send OTP for email verification
export async function sendOTP(email: string) {
  try {
    const { account, databases } = await createAdminClient();
    
    // Check if user already exists
    const userDocs = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.equal('email', [email])]
    );
    
    const userExists = userDocs.total > 0;
    
    try {
      // Create a verification token
      const token = await account.createVerification(
        `${process.env.NEXT_PUBLIC_APP_URL}/verify-otp`
      );
      
      return { 
        success: true, 
        sessionId: token.$id,
        userExists
      };
    } catch (error) {
      console.error('Failed to create verification:', error);
      
      // If verification failed because user doesn't exist, create the user account first
      if (!userExists) {
        try {
          // Create a new account
          const newUser = await account.create(
            ID.unique(),
            email,
            ID.unique(), // Random password (won't be used)
            email.split('@')[0] // Use email prefix as default name
          );
          
          // Try verification again
          const token = await account.createVerification(
            `${process.env.NEXT_PUBLIC_APP_URL}/verify-otp`
          );
          
          return { 
            success: true, 
            sessionId: token.$id,
            userExists: false
          };
        } catch (createError) {
          console.error('Failed to create account:', createError);
          throw new Error('Failed to create account');
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new Error('Failed to send OTP');
  }
}

// Verify OTP and create session
export async function verifyOTP(email: string, otp: string) {
  try {
    const { account, databases } = await createAdminClient();
    
    // Verify the email token
    const verification = await account.updateVerification(email, otp);
    
    if (!verification) {
      return { success: false, error: 'Invalid OTP' };
    }
    
    // Create session
    const session = await account.createSession(email, otp);
    
    // Set session cookie
    await setCookie('appwrite-session', session.secret, 60 * 60 * 24 * 30); // 30 days
    
    // Check if user exists in our database, if not, create it
    const userDocs = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.equal('accountId', [session.userId])]
    );
    
    if (userDocs.total === 0) {
      // Create user document
      await databases.createDocument(
        fullConfig.databaseId,
        fullConfig.usersCollectionId,
        ID.unique(),
        {
          fullName: email.split('@')[0], // Default name
          email,
          avatar: avatarPlaceholderUrl,
          accountId: session.userId,
          department: '',
          role: 'user', // Default role
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
    }
    
    return { 
      success: true, 
      userId: session.userId,
      isNewUser: userDocs.total === 0
    };
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    
    if (error?.message?.includes('Invalid token')) {
      return { success: false, error: 'Invalid or expired OTP' };
    }
    
    return { success: false, error: 'Failed to verify OTP' };
  }
}

// Sign out user
export async function signOut() {
  try {
    const sessionClient = await createSessionClient();
    if (!sessionClient) return { success: false, error: 'Not authenticated' };
    
    const { account } = sessionClient;
    
    // Delete the current session
    await account.deleteSession('current');
    
    // Delete the session cookie
    await deleteCookie('appwrite-session');
    
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Failed to sign out');
  }
}

// Update user profile
export async function updateUserProfile(userId: string, data: Record<string, any>, path: string = '/dashboard/profile') {
  try {
    const { databases } = await createAdminClient();
    
    // Get current user to verify permission
    const currentUser = await getCurrentUser();
    
    if (!currentUser) throw new Error('Not authenticated');
    
    // Only allow users to update their own profile or admins to update any profile
    if (currentUser.$id !== userId && currentUser.role !== 'admin') {
      throw new Error('Permission denied');
    }
    
    // Add updated timestamp
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    // Update user document
    const updatedUser = await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId,
      updateData
    );
    
    // Revalidate path to update UI
    revalidatePath(path);
    
    return updatedUser;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update profile');
  }
}

// Get all users (for admin only)
export async function getAllUsers({
  search = '',
  role = null,
  limit = 20,
  offset = 0
}: {
  search?: string;
  role?: string | null;
  limit?: number;
  offset?: number;
}) {
  try {
    const { databases } = await createAdminClient();
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Permission denied');
    }
    
    const queries = [
      Query.limit(limit),
      Query.offset(offset)
    ];
    
    // Add search filter
    if (search) {
      queries.push(
        Query.or([
          Query.contains('fullName', search),
          Query.contains('email', search)
        ])
      );
    }
    
    // Add role filter
    if (role) {
      queries.push(Query.equal('role', [role]));
    }
    
    const result = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      queries
    );
    
    return {
      users: result.documents,
      total: result.total,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(result.total / limit)
    };
  } catch (error) {
    console.error('Error getting users:', error);
    throw new Error('Failed to get users');
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<AppwriteUser | null> {
  try {
    const { databases } = await createAdminClient();
    
    const user = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId
    );
    
    return user as AppwriteUser;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

// Get user by email
export async function getUserByEmail(email: string): Promise<AppwriteUser | null> {
  try {
    const { databases } = await createAdminClient();
    
    const result = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.equal('email', [email])]
    );
    
    return result.total > 0 ? result.documents[0] as AppwriteUser : null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
} 