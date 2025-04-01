'use server';

import { Client, Databases, Storage, Users } from 'node-appwrite';

// Initialize the Appwrite client for server-side operations
const serverClient = new Client();

// Get environment variables
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';
const apiKey = process.env.APPWRITE_API_KEY || '';

// Log configuration (without exposing the full API key)
console.log('Server config - Endpoint:', endpoint);
console.log('Server config - Project ID:', projectId);
console.log('Server config - API Key available:', apiKey ? 'Yes' : 'No');

if (!apiKey) {
  console.error('CRITICAL ERROR: Missing APPWRITE_API_KEY environment variable');
}

// Set Appwrite endpoint, project ID, and API key
serverClient
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey); // Use server-side env variable, not NEXT_PUBLIC_

// Initialize Appwrite services
export const databases = new Databases(serverClient);
export const storage = new Storage(serverClient);
export const users = new Users(serverClient);

// Define database and collection IDs (same as client-side)
export const DATABASES = {
  MAIN: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '',
};

export const COLLECTIONS = {
  FILES: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION_ID || '',
  DEPARTMENTS: process.env.NEXT_PUBLIC_APPWRITE_DEPARTMENTS_COLLECTION_ID || '',
  USERS: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || '',
  FILES_METADATA: process.env.NEXT_PUBLIC_APPWRITE_FILES_METADATA_COLLECTION_ID || '',
  OCR_RESULTS: process.env.NEXT_PUBLIC_APPWRITE_OCR_RESULTS_COLLECTION_ID || '',
  DOCUMENT_TAGS: process.env.NEXT_PUBLIC_APPWRITE_DOCUMENT_TAGS_COLLECTION_ID || '',
};

export const STORAGE_BUCKETS = {
  FILES: process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || '',
}; 