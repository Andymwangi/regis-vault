'use server';

import { NextResponse } from 'next/server';
import { processOcrInBackground } from '@/lib/appwrite/ocr-operations';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Redis } from '@upstash/redis';

// Add a simple API key check for security
const API_KEY = process.env.OCR_WORKER_API_KEY;

// Initialize Redis client
const getRedisClient = async () => {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  });
  return redis;
};

export async function GET(request: Request) {
  // Basic security check - both API key and admin role are required
  const { searchParams } = new URL(request.url);
  const providedKey = searchParams.get('key');
  
  // Check if it's a cron job (with API key) or an admin user
  const isCronJob = API_KEY && providedKey === API_KEY;
  
  let isAdmin = false;
  if (!isCronJob) {
    // If not a cron job with valid API key, check if it's an admin user
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      isAdmin = currentUser.role === 'admin';
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  try {
    // Get Redis client
    const redis = await getRedisClient();
    
    // Find jobs that need processing
    const { databases } = await createAdminClient();
    const ocrJobs = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      [
        Query.equal('status', ['processing']),
        Query.limit(1)
      ]
    );
    
    if (ocrJobs.documents.length === 0) {
      return NextResponse.json({ status: 'idle', message: 'No pending jobs' });
    }
    
    const job = ocrJobs.documents[0];
    const fileId = job.fileId;
    
    // Get the file details to get bucketFileId
    const file = await databases.getDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      fileId
    );
    
    // Cache job status in Redis for admin dashboard
    await redis.set(`ocr:job:${fileId}`, {
      fileId,
      fileName: file.name,
      status: 'processing',
      processingStartedAt: new Date().toISOString()
    });
    
    // Process the OCR job
    try {
      // Call processOcrInBackground directly even though it's technically
      // a private function in the module - in a real implementation, you'd
      // make this function public or create a dedicated API
      const result = await processOcrInBackground(fileId, file.bucketFileId);
      
      // Update Redis cache
      await redis.set(`ocr:job:${fileId}`, {
        fileId,
        fileName: file.name,
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        status: 'completed', 
        jobId: `ocr:job:${fileId}`,
        fileId
      });
    } catch (error) {
      // Update Redis cache
      await redis.set(`ocr:job:${fileId}`, {
        fileId,
        fileName: file.name,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date().toISOString()
      });
      
      throw error; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    console.error('Error processing OCR job:', error);
    
    return NextResponse.json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 