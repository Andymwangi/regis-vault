"use server";

import { createAdminClient, createSessionClient } from "./index";
import { fullConfig } from "./config";
import { ID, Query } from "node-appwrite";
import { parseStringify } from "@/lib/utils";
import { cookies } from "next/headers";
import { avatarPlaceholderUrl } from "@/constants";
import { setCookie, deleteCookie } from "./cookie-utils";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { sendMagicLink } from "@/lib/actions/email.actions";

const handleError = (error: unknown, message: string) => {
  console.error(`${message}:`, error);
  throw error;
};

export const createAccountServer = async (
  email: string,
  name: string,
  department: string = "",
  role: string = "user"
) => {
  const { account, databases } = await createAdminClient();
  let authUser = null;

  try {
    // Debug: Log the email being validated
    console.log('Attempting to create account for:', email);
    
    // Basic email format check
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required');
    }

    // Clean the email
    const cleanEmail = email.toLowerCase().trim();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please provide a valid email address');
    }
    
    // Check if user already exists in Appwrite Auth
    try {
      const existingUsers = await databases.listDocuments(
        fullConfig.databaseId,
        fullConfig.usersCollectionId,
        [Query.equal("email", cleanEmail)]
      );
      
      if (existingUsers.total > 0) {
        console.log('User already exists in database:', existingUsers.documents[0].$id);
        // If user exists, send magic link and return
        await sendMagicLink(cleanEmail, "sign-in", "/dashboard");
        return parseStringify({ 
          success: true, 
          message: "User already exists, magic link sent for sign-in"
        });
      }
    } catch (checkError) {
      console.error('Error checking existing user:', checkError);
      // Continue with account creation if check fails
    }
    
    // Create Appwrite account using email+name
    try {
      authUser = await account.create(
        ID.unique(),
        cleanEmail,
        `P@ssw0rd${Date.now()}`, // Use a proper password format
        name.trim() // Trim whitespace from name
      );
      console.log('Appwrite auth account created successfully:', authUser.$id);
    } catch (authError: any) {
      // Check if user already exists in Auth but not in database
      if (authError.message?.includes('already exists')) {
        console.log('User exists in Auth but not in database. Will create database record.');
        // Try to get the user by email from Auth
        try {
          // We'll need to create the database document for this auth user
          // First, get a session to retrieve the user ID
          const session = await account.createEmailPasswordSession(
            cleanEmail,
            `P@ssw0rd${Date.now()}`
          );
          authUser = await account.get();
          await account.deleteSessions(); // Clean up the session
        } catch (sessionError) {
          console.error('Error getting existing auth user:', sessionError);
          throw new Error('User exists but unable to retrieve details');
        }
      } else {
        // For other auth errors, rethrow
        throw authError;
      }
    }

    if (!authUser) {
      throw new Error('Failed to create or retrieve auth account');
    }

    // Create user document in database
    let userDoc;
    try {
      userDoc = await databases.createDocument(
        fullConfig.databaseId,
        fullConfig.usersCollectionId,
        ID.unique(),
        {
          fullName: name.trim(),
          email: cleanEmail,
          avatar: avatarPlaceholderUrl,
          accountId: authUser.$id,
          department,
          role,
          status: "active",
          theme: "light",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
      console.log('User document created successfully:', userDoc.$id);
    } catch (dbError: any) {
      console.error('Failed to create user document:', dbError);
      
      // If we created an auth user but failed to create the DB user,
      // we should try to delete the auth user to keep things in sync
      if (authUser && !userDoc) {
        try {
          // Only attempt to delete if we just created the auth user
          await account.deleteSession('current');
          console.log('Logged out user due to database document creation failure');
          // We can't delete the auth user directly, as it requires verification
        } catch (deleteError) {
          console.error('Failed to delete session after database error:', deleteError);
        }
      }
      
      throw new Error('Failed to create user in database: ' + dbError.message);
    }

    // Send magic link for account verification
    try {
      const emailResult = await sendMagicLink(cleanEmail, "sign-up", "/dashboard");
      if (!emailResult.success) {
        console.error('Failed to send magic link:', emailResult.error);
        // Don't throw error here, as account is already created
      }
    } catch (emailError) {
      console.error('Error sending magic link:', emailError);
      // Don't fail account creation if magic link fails
    }

    return parseStringify({ 
      success: true, 
      userId: authUser.$id,
      userDocId: userDoc?.$id
    });
  } catch (error: any) {
    console.error('Error in createAccountServer:', error);
    
    // Handle specific Appwrite errors
    if (error.message?.includes('Invalid `email` param')) {
      throw new Error('Please provide a valid email address');
    }
    
    // Return a more specific error message
    throw new Error(error.message || 'Failed to create account');
  }
};

export const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();

  try {
    // Clean the email
    const cleanEmail = email.toLowerCase().trim();
    
    console.log('Looking up user by email:', cleanEmail);
    
    const result = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.equal("email", cleanEmail)]
    );

    if (result.total > 0) {
      console.log('User found in database:', result.documents[0].$id);
      return parseStringify(result.documents[0]);
    }
    
    console.log('No user found in database for email:', cleanEmail);
    return null;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    handleError(error, "Failed to get user");
  }
};

export const updateUserRole = async (userId: string, role: string) => {
  const { databases } = await createAdminClient();
  
  try {
    // Verify the role is valid
    if (!['admin', 'manager', 'user'].includes(role)) {
      throw new Error('Invalid role');
    }
    
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId,
      { 
        role,
        updatedAt: new Date().toISOString()
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new Error('Failed to update user role');
  }
};

export const updateUserDepartment = async (userId: string, department: string) => {
  const { databases } = await createAdminClient();
  
  try {
    // Verify the department exists
    if (department) {
      const deptResult = await databases.getDocument(
        fullConfig.databaseId,
        fullConfig.departmentsCollectionId,
        department
      );
      
      if (!deptResult) {
        throw new Error('Department not found');
      }
    }
    
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId,
      { 
        department,
        updatedAt: new Date().toISOString()
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user department:', error);
    throw new Error('Failed to update user department');
  }
};

export const createDepartment = async (name: string, description?: string) => {
  const { databases } = await createAdminClient();
  
  try {
    const result = await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      ID.unique(),
      {
        name,
        description,
        allocatedStorage: 10 * 1024 * 1024 * 1024, // Default 10GB storage allocation
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
    
    return { success: true, department: result };
  } catch (error) {
    console.error('Error creating department:', error);
    throw new Error('Failed to create department');
  }
};

export const getDepartments = async () => {
  const { databases } = await createAdminClient();
  
  try {
    const result = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.departmentsCollectionId,
      [Query.orderAsc('name')]
    );
    
    return { success: true, departments: result.documents };
  } catch (error) {
    console.error('Error fetching departments:', error);
    throw new Error('Failed to fetch departments');
  }
};

// Sign out the user
export async function signOut() {
  try {
    // Just delete the session cookie since we're using custom JWT sessions
    await deleteCookie("session");
    return { success: true };
  } catch (error) {
    console.error("Error signing out:", error);
    return { success: false, error: "Failed to sign out" };
  }
}

// Complete user profile
export async function completeUserProfile(
  accountId: string,
  data: { 
    fullName: string;
    department?: string;
    avatar?: string;
  }
) {
  try {
    const { databases } = await createAdminClient();
    const sessionClient = await createSessionClient();
    
    if (!sessionClient) {
      return { success: false, error: "Not authenticated" };
    }
    
    // Find user document by accountId
    const users = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.equal("accountId", [accountId])]
    );
    
    if (users.total === 0) {
      return { success: false, error: "User not found" };
    }
    
    const userDoc = users.documents[0];
    
    // Update user profile
    const updatedUser = await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userDoc.$id,
      {
        fullName: data.fullName,
        ...(data.department && { department: data.department }),
        ...(data.avatar && { avatar: data.avatar }),
        needsProfileCompletion: false,
        updatedAt: new Date().toISOString()
      }
    );
    
    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Error completing user profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
} 