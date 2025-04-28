"use server";

import { createAdminClient, createSessionClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';
import { setCookie, deleteCookie } from '@/lib/appwrite/cookie-utils';
import { InputFile } from 'node-appwrite/file';

/**
 * Send a One-Time Password to the user's email
 */
export async function sendOTP(email: string) {
  try {
    const { account } = await createAdminClient();
    
    // Create a verification request - Appwrite will send an email with a code
    const result = await account.createVerification(
      `${process.env.NEXT_PUBLIC_APP_URL}/verify`
    );
    
    // We also need to create a temporary user if they don't exist
    try {
      // Try to create a user - this might fail if user already exists
      await account.create(
        ID.unique(),
        email,
        ID.unique(), // Generate a random password
        email.split('@')[0] // Use part of the email as the name
      );
    } catch (error) {
      // Ignore error if user already exists
      console.log("User might already exist:", error);
    }
    
    return { 
      success: true, 
      userId: result.userId,
      secret: result.secret
    };
  } catch (error) {
    console.error("Error sending OTP:", error);
    return { success: false, error: "Failed to send verification code" };
  }
}

/**
 * Verify a One-Time Password
 */
export async function verifyOTP(userId: string, secret: string) {
  try {
    const { account, databases } = await createAdminClient();
    
    // Create a session using the verification
    const result = await account.createSession(userId, secret);
    
    // Set session cookie
    await setCookie("appwrite-session", result.secret, 60 * 60 * 24 * 30); // 30 days
    
    // Get or create user document
    const users = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.equal("accountId", [userId])]
    );
    
    let isNewUser = false;
    
    if (users.total === 0) {
      // User doesn't exist in our collection yet, get account info
      const userAccount = await account.get();
      
      // Create user document
      await databases.createDocument(
        fullConfig.databaseId,
        fullConfig.usersCollectionId,
        ID.unique(),
        {
          fullName: userAccount.name || userAccount.email.split('@')[0],
          email: userAccount.email,
          avatar: "", // Will be set later
          accountId: userId,
          role: "user",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          needsProfileCompletion: true
        }
      );
      
      isNewUser = true;
    }
    
    return { 
      success: true, 
      userId,
      isNewUser 
    };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { success: false, error: "Invalid or expired verification code" };
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    const sessionClient = await createSessionClient();
    
    if (sessionClient) {
      try {
        await sessionClient.account.deleteSession('current');
      } catch (error) {
        console.error("Error deleting session:", error);
      }
    }
    
    // Delete cookie regardless of session deletion success
    await deleteCookie("appwrite-session");
    
    return { success: true };
  } catch (error) {
    console.error("Error signing out:", error);
    return { success: false, error: "Failed to sign out" };
  }
}

/**
 * Update user avatar
 */
export async function updateAvatar(userId: string, file: File) {
  try {
    const { storage, databases } = await createAdminClient();
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to storage
    const avatar = await storage.createFile(
      fullConfig.storageId,
      `avatar-${userId}-${Date.now()}`,
      InputFile.fromBuffer(buffer, file.name)
    );
    
    // Get file URL
    const avatarUrl = `${fullConfig.endpoint}/storage/buckets/${fullConfig.storageId}/files/${avatar.$id}/view?project=${fullConfig.projectId}`;
    
    // Update user document
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId,
      {
        avatar: avatarUrl,
        updatedAt: new Date().toISOString()
      }
    );
    
    return { success: true, avatarUrl };
  } catch (error) {
    console.error("Error updating avatar:", error);
    return { success: false, error: "Failed to update avatar" };
  }
} 