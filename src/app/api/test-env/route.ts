'use server';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const appwriteConfig = {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT,
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE,
    filesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION,
    storageId: process.env.NEXT_PUBLIC_APPWRITE_STORAGE_ID,
    apiKeyProvided: !!process.env.APPWRITE_API_KEY,
  };
  
  return NextResponse.json({
    appwriteConfig,
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('APPWRITE') || key.includes('DATABASE')
    ),
  });
} 