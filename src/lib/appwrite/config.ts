import { Client, Account, Databases, Storage } from "node-appwrite";

// Initialize client
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT || "")
  .setKey(process.env.APPWRITE_API_KEY || "");

// Initialize services with error handling
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Database and collection IDs with validation
export const DATABASES = {
  main: process.env.NEXT_PUBLIC_APPWRITE_DATABASE || "",
};

export const COLLECTIONS = {
  users: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION || "",
  files: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION || "",
  activityLogs: process.env.NEXT_PUBLIC_APPWRITE_ACTIVITY_LOGS_COLLECTION_ID || "",
  ocrResults: process.env.NEXT_PUBLIC_APPWRITE_OCR_RESULTS_COLLECTION || "",
  documentTags: process.env.NEXT_PUBLIC_APPWRITE_FILES_TAGS_COLLECTION || "",
  departments: process.env.NEXT_PUBLIC_APPWRITE_DEPARTMENTS_COLLECTION_ID || "",
  userSettings: process.env.NEXT_PUBLIC_APPWRITE_USER_SETTINGS_COLLECTION_ID || "",
  appSettings: process.env.NEXT_PUBLIC_APPWRITE_APP_SETTINGS_COLLECTION_ID || "",
};

export const STORAGE_BUCKETS = {
  files: process.env.NEXT_PUBLIC_APPWRITE_STORAGE_ID || "",
  avatars: process.env.NEXT_PUBLIC_APPWRITE_AVATAR_BUCKET_ID || "",
};

export interface AppwriteConfig {
  endpoint: string;
  projectId: string;
  databaseId: string;
  usersCollectionId: string;
  filesCollectionId: string;
  activityLogsCollectionId: string;
  ocrResultsCollectionId: string;
  documentTagsCollectionId: string;
  departmentsCollectionId: string;
  userSettingsCollectionId: string;
  appSettingsCollectionId: string;
  storageId: string;
  avatarBucketId: string;
  bucketId: string; // Added bucketId property to fix the TypeScript error
  apiKey?: string;
}

export const fullConfig: AppwriteConfig = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT || '',
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE || '',
  usersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION || '',
  filesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION || '',
  activityLogsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_ACTIVITY_LOGS_COLLECTION_ID || '',
  ocrResultsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_OCR_RESULTS_COLLECTION || '',
  documentTagsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_FILES_TAGS_COLLECTION || '',
  departmentsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_DEPARTMENTS_COLLECTION_ID || '',
  userSettingsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USER_SETTINGS_COLLECTION_ID || '',
  appSettingsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_APP_SETTINGS_COLLECTION_ID || '',
  storageId: process.env.NEXT_PUBLIC_APPWRITE_STORAGE_ID || '',
  avatarBucketId: process.env.NEXT_PUBLIC_APPWRITE_AVATAR_BUCKET_ID || process.env.NEXT_PUBLIC_APPWRITE_STORAGE_ID || '',
  bucketId: process.env.NEXT_PUBLIC_APPWRITE_STORAGE_ID || '', // Using storageId as bucketId
  apiKey: process.env.APPWRITE_API_KEY
};

// Throw an error during initialization if any required config is missing
const requiredKeys: (keyof AppwriteConfig)[] = [
  'projectId',
  'databaseId',
  'usersCollectionId',
  'filesCollectionId',
  'activityLogsCollectionId',
  'storageId'
];

export function validateConfig() {
  const missingKeys = requiredKeys.filter(key => !fullConfig[key]);
  
  if (missingKeys.length > 0) {
    console.error(`Missing required Appwrite configuration: ${missingKeys.join(', ')}`);
    return false;
  }
  
  return true;
}

// Client-side config (safe to use in browser)
export const clientConfig = {
  endpoint: fullConfig.endpoint,
  projectId: fullConfig.projectId
};

// Verify Appwrite setup
export const verifyAppwriteSetup = async () => {
  const issues: string[] = [];

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) issues.push("Missing NEXT_PUBLIC_APPWRITE_ENDPOINT");
  if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT) issues.push("Missing NEXT_PUBLIC_APPWRITE_PROJECT");
  if (!process.env.NEXT_PUBLIC_APPWRITE_DATABASE) issues.push("Missing NEXT_PUBLIC_APPWRITE_DATABASE");
  if (!process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION) issues.push("Missing NEXT_PUBLIC_APPWRITE_USERS_COLLECTION");
  if (!process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION) issues.push("Missing NEXT_PUBLIC_APPWRITE_FILES_COLLECTION");
  if (!process.env.NEXT_PUBLIC_APPWRITE_ACTIVITY_LOGS_COLLECTION_ID) issues.push("Missing NEXT_PUBLIC_APPWRITE_ACTIVITY_LOGS_COLLECTION_ID");
  if (!process.env.NEXT_PUBLIC_APPWRITE_OCR_RESULTS_COLLECTION) issues.push("Missing NEXT_PUBLIC_APPWRITE_OCR_RESULTS_COLLECTION");
  if (!process.env.NEXT_PUBLIC_APPWRITE_FILES_TAGS_COLLECTION) issues.push("Missing NEXT_PUBLIC_APPWRITE_FILES_TAGS_COLLECTION");
  if (!process.env.NEXT_PUBLIC_APPWRITE_DEPARTMENTS_COLLECTION_ID) issues.push("Missing NEXT_PUBLIC_APPWRITE_DEPARTMENTS_COLLECTION_ID");
  if (!process.env.NEXT_PUBLIC_APPWRITE_STORAGE_ID) issues.push("Missing NEXT_PUBLIC_APPWRITE_STORAGE_ID");
  if (!process.env.APPWRITE_API_KEY) issues.push("Missing APPWRITE_API_KEY");

  // Check if collections exist
  try {
    const collections = await databases.listCollections(DATABASES.main);
    const collectionIds = collections.collections.map(c => c.$id);

    if (!collectionIds.includes(COLLECTIONS.users)) {
      issues.push(`Users collection (${COLLECTIONS.users}) not found`);
    }
    if (!collectionIds.includes(COLLECTIONS.files)) {
      issues.push(`Files collection (${COLLECTIONS.files}) not found`);
    }
    if (!collectionIds.includes(COLLECTIONS.activityLogs)) {
      issues.push(`Activity logs collection (${COLLECTIONS.activityLogs}) not found`);
    }
    if (!collectionIds.includes(COLLECTIONS.ocrResults)) {
      issues.push(`OCR results collection (${COLLECTIONS.ocrResults}) not found`);
    }
    if (!collectionIds.includes(COLLECTIONS.documentTags)) {
      issues.push(`Document tags collection (${COLLECTIONS.documentTags}) not found`);
    }
  } catch (error) {
    issues.push("Failed to verify collections");
  }

  // Check if storage bucket exists
  try {
    const buckets = await storage.listBuckets();
    const bucketIds = buckets.buckets.map(b => b.$id);

    if (!bucketIds.includes(STORAGE_BUCKETS.files)) {
      issues.push(`Files bucket (${STORAGE_BUCKETS.files}) not found`);
    }
  } catch (error) {
    issues.push("Failed to verify storage buckets");
  }

  return {
    isValid: issues.length === 0,
    issues
  };
};