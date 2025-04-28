'use server';

import { NextRequest, NextResponse } from 'next/server';
import { fullConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { client, databases, storage } = await createAdminClient();
    
    // Test database connection by fetching a sample file
    const fileTest = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      [Query.limit(1), Query.equal('status', ['deleted'])]
    );
    
    // Test storage connection
    const storageTest = await storage.listFiles(
      fullConfig.storageId,
      [Query.limit(1)]
    );
    
    // Additional permissions test
    const permissions = {
      canListBuckets: true,
      canAccessDatabase: true
    };
    
    try {
      await storage.listBuckets();
    } catch (error) {
      permissions.canListBuckets = false;
    }
    
    try {
      await databases.listCollections(fullConfig.databaseId);
    } catch (error) {
      permissions.canAccessDatabase = false;
    }
    
    // Collection of configuration details
    const config = {
      endpoint: fullConfig.endpoint,
      projectId: fullConfig.projectId,
      databaseId: fullConfig.databaseId,
      storageId: fullConfig.storageId,
      filesCollectionId: fullConfig.filesCollectionId,
      hasApiKey: !!fullConfig.apiKey
    };
    
    return NextResponse.json({
      status: 'success',
      connection: {
        client: !!client,
        database: !!databases,
        storage: !!storage
      },
      tests: {
        fileCount: fileTest.total,
        fileListSuccess: fileTest.total >= 0,
        storageFileCount: storageTest.total,
        storageListSuccess: storageTest.total >= 0
      },
      permissions,
      config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API test failed:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 