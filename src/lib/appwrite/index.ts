"use server";

import { Account, Avatars, Client, Databases, Storage, Functions, Teams, ID, Query } from "node-appwrite";
import { fullConfig, STORAGE_BUCKETS } from "@/lib/appwrite/config";
import { cookies } from "next/headers";
import { getCookie } from "./cookie-utils";

// Create a client for server-side operations
export async function createClient() {
  const client = new Client()
    .setEndpoint(fullConfig.endpoint)
    .setProject(fullConfig.projectId);
  
  return client;
}

// Create an admin client with API key (for server-side operations)
export async function createAdminClient() {
  if (!fullConfig.apiKey) {
    console.error("Appwrite API key is not defined");
    throw new Error("Appwrite API key is not defined");
  }

  if (!fullConfig.projectId) {
    console.error("Appwrite Project ID is not defined");
    throw new Error("Appwrite Project ID is not defined");
  }

  console.log("Creating admin client with config:", {
    endpoint: fullConfig.endpoint,
    projectId: fullConfig.projectId,
    apiKeyProvided: !!fullConfig.apiKey
  });

  try {
    const client = new Client()
      .setEndpoint(fullConfig.endpoint)
      .setProject(fullConfig.projectId)
      .setKey(fullConfig.apiKey);
    
    // Test the connection by making a simple API call
    const account = new Account(client);
    const databases = new Databases(client);
    const storage = new Storage(client);
    
    return {
      client,
      account,
      databases,
      storage,
    };
  } catch (error) {
    console.error("Error creating Appwrite admin client:", error);
    throw new Error(`Failed to create Appwrite admin client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Create a client with session cookie (for authenticated user operations)
export async function createSessionClient() {
  try {
    // Get the session cookie
    const sessionCookie = await getCookie("session");
    if (!sessionCookie) {
      console.log("No session cookie found");
      return null;
    }

    // Verify the session token
    const jwt = await import('jsonwebtoken');
    
    let decoded;
    try {
      decoded = jwt.verify(sessionCookie, process.env.JWT_SECRET || "fallback-secret") as {
        id: string;
        email: string;
        accountId: string;
        role: string;
      };
    } catch (jwtError) {
      console.error("Invalid JWT token:", jwtError);
      return null;
    }

    if (!decoded || !decoded.accountId) {
      console.error("Invalid session data:", decoded);
      return null;
    }

    // Create admin client since we're not using Appwrite sessions
    const { databases, storage } = await createAdminClient();
    
    // Get the user from the database
    const result = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.equal("accountId", [decoded.accountId])]
    );
    
    if (result.total === 0) {
      console.error("User not found with accountId:", decoded.accountId);
      return null;
    }

    return {
      client: null, // We don't need the client for our custom session
      account: null, // We don't use Appwrite account anymore
      databases, // Return the databases client from admin client
      user: result.documents[0], // Add the user data directly
      storage, // Return the storage client
    };
  } catch (error) {
    console.error("Error creating session client:", error);
    return null;
  }
}

// Helper function to check if user has admin role
export async function isAdmin() {
  try {
    const sessionClient = await createSessionClient();
    if (!sessionClient) return false;
    
    const user = sessionClient.user;
    return user.role === "admin";
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// Helper functions for common operations

// Get user by ID
export async function getUserById(userId: string) {
  try {
    const { databases } = await createAdminClient();
    
    const user = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      userId
    );
    
    return user;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

// Get file document by ID
export async function getFileById(fileId: string) {
  try {
    const { databases } = await createAdminClient();
    
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    return file;
  } catch (error) {
    console.error("Error getting file:", error);
    return null;
  }
}

// Check if user has access to file
export async function hasFileAccess(userId: string, fileId: string) {
  try {
    const { databases } = await createAdminClient();
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );

    // Check if user is owner or has shared access
    return (
      file.ownerId === userId ||
      (Array.isArray(file.sharedWith) && file.sharedWith.includes(userId))
    );
  } catch (error) {
    console.error("Error checking file access:", error);
    return false;
  }
}

// Generate a file preview URL
export async function getFilePreviewUrl(fileId: string, width = 400) {
  return `${fullConfig.endpoint}/storage/buckets/${fullConfig.storageId}/files/${fileId}/preview?width=${width}&project=${fullConfig.projectId}`;
}

// Generate a file download URL
export async function getFileDownloadUrl(fileId: string) {
  return `${fullConfig.endpoint}/storage/buckets/${fullConfig.storageId}/files/${fileId}/download?project=${fullConfig.projectId}`;
}

// File type helpers
export async function getFileType(mimetype: string): Promise<string> {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (
    mimetype === 'application/pdf' ||
    mimetype.includes('word') ||
    mimetype.includes('excel') ||
    mimetype.includes('text/') ||
    mimetype.includes('presentation')
  ) return 'document';
  
  return 'other';
}

// More helper functions can be added based on specific requirements
