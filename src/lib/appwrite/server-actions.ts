'use server';

import { db } from '../../lib/db';
import { ocrResults } from '../../server/db/schema/schema';
import { enqueueOCRJob } from '../ocr/server-actions';
// Import server-side Appwrite configuration
import { databases, storage, users, DATABASES, COLLECTIONS, STORAGE_BUCKETS } from './server-config';
import { ID, Query } from 'node-appwrite';

/**
 * Server-side action to initialize OCR processing for a file
 * This includes creating the OCR record in PostgreSQL and queueing the OCR job
 */
export async function initializeOCRProcessing(fileId: string, fileUrl: string) {
  try {
    // Initialize OCR result in PostgreSQL
    await db.insert(ocrResults).values({
      fileId,
      text: '',
      confidence: 0,
      language: '',
      pageCount: 0,
      status: 'pending',
      processingTime: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Queue OCR job for processing
    await enqueueOCRJob(fileId, fileUrl);
    
    return true;
  } catch (error) {
    console.error('Error initializing OCR processing:', error);
    throw error;
  }
}

/**
 * Server-side action to get all users (admin only)
 */
export async function getAllUsers() {
  try {
    return await users.list();
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

/**
 * Server-side action to create a user with admin privileges
 */
export async function createAdminUser(email: string, password: string, name: string) {
  try {
    // Create the user through the server SDK
    const user = await users.create(
      ID.unique(),
      email,
      undefined, // Phone
      password,
      name
    );
    
    // Add the user to the departments collection
    const profile = await databases.createDocument(
      DATABASES.MAIN,
      COLLECTIONS.DEPARTMENTS,
      ID.unique(),
      {
        userId: user.$id,
        name,
        email,
        department: 'Administration',
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
    
    return { user, profile };
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

/**
 * Server-side version of createAccount that uses the API key to bypass guest permissions
 * This should be called from client-side when normal account creation fails
 */
export async function createAccountServer(email: string, password: string, name: string, department: string, role: string = 'user') {
  console.log(`Creating server-side account for ${email} in ${department} with role ${role}`);
  
  try {
    // Step 1: Check if user already exists by trying to find with same email
    try {
      const existingUsers = await databases.listDocuments(
        DATABASES.MAIN,
        COLLECTIONS.DEPARTMENTS,
        [Query.equal('email', email)]
      );
      
      if (existingUsers.documents.length > 0) {
        throw new Error('User with this email already exists');
      }
    } catch (checkError) {
      // Only throw if it's an existing user error, otherwise continue with creation
      if (checkError instanceof Error && 
          checkError.message.includes('already exists')) {
        throw checkError;
      }
      console.log('Error while checking existing user, proceeding with creation attempt');
    }
    
    // Step 2: Create user account with server SDK (using API key)
    console.log('Creating user account with Appwrite server SDK');
    let newAccount;
    try {
      newAccount = await users.create(
        ID.unique(),
        email,
        password,
        name
      );
      console.log('User account created successfully:', newAccount.$id);
    } catch (createError) {
      console.error('Error creating user account:', createError);
      throw createError;
    }
    
    // Step 3: Store additional user data
    console.log('Creating user profile in DEPARTMENTS collection');
    try {
      const userProfile = await databases.createDocument(
        DATABASES.MAIN,
        COLLECTIONS.DEPARTMENTS,
        ID.unique(),
        {
          userId: newAccount.$id,
          name,
          email,
          department,
          role,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
      
      console.log('User profile created successfully');
      return { newAccount, userProfile };
    } catch (profileError) {
      console.error('Error creating user profile:', profileError);
      
      // Attempt to clean up the created user if profile creation fails
      try {
        await users.delete(newAccount.$id);
        console.log('Cleaned up user account due to profile creation failure');
      } catch (cleanupError) {
        console.error('Failed to clean up user account:', cleanupError);
      }
      
      throw profileError;
    }
  } catch (error) {
    console.error('Error in createAccountServer:', error);
    throw error;
  }
} 