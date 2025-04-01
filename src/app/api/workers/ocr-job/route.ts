'use server';

import { NextResponse } from 'next/server';
import { processOCR } from '@/lib/ocr/processor';
import { account, databases, DATABASES, COLLECTIONS, sanitizeUserId, getUserProfileById } from '@/lib/appwrite/config';
import { Query } from 'appwrite';
import { Redis } from '@upstash/redis';

// Add a simple API key check for security
const API_KEY = process.env.OCR_WORKER_API_KEY;

// Define OCR job interface
interface OCRJob {
  fileId: string;
  fileUrl: string;
  status: string;
  createdAt?: string;
  [key: string]: any;
}

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
  
  if (!isCronJob) {
    // If not a cron job with valid API key, check if it's an admin user
    try {
      const user = await account.get();
      
      // Verify admin role using the helper function
      const userProfileData = await getUserProfileById(user.$id);
      
      if (!userProfileData || userProfileData.profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  try {
    // Get Redis client
    const redis = await getRedisClient();
    
    // Find pending OCR jobs
    const keys = await redis.keys('ocr:job:*');
    const pendingJobs: Array<OCRJob & { key: string }> = [];
    
    for (const key of keys) {
      const job = await redis.get(key) as OCRJob | null;
      if (job && job.status === 'queued') {
        pendingJobs.push({
          key,
          ...job
        });
      }
    }
    
    if (pendingJobs.length === 0) {
      return NextResponse.json({ status: 'idle', message: 'No pending jobs' });
    }
    
    // Process the oldest job (sort by createdAt)
    const jobsWithDates = pendingJobs.map(job => ({
      ...job,
      createdAtTime: job.createdAt ? new Date(job.createdAt).getTime() : 0
    }));
    
    const oldestJob = jobsWithDates.sort((a, b) => a.createdAtTime - b.createdAtTime)[0];
    const { fileId, fileUrl } = oldestJob;
    
    // Update status to processing
    await redis.set(oldestJob.key, {
      ...oldestJob,
      status: 'processing',
      processingStartedAt: new Date().toISOString()
    });
    
    // Process the OCR
    const result = await processOCR(fileId, fileUrl);
    
    // Update with completed status
    await redis.set(oldestJob.key, {
      ...oldestJob,
      status: 'completed',
      result,
      completedAt: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      status: 'completed', 
      jobId: oldestJob.key,
      fileId: fileId,
      result
    });
  } catch (error) {
    console.error('Error processing OCR job:', error);
    
    // If we have a jobKey, update the job with error status
    const { searchParams } = new URL(request.url);
    const jobKey = searchParams.get('jobKey');
    
    if (jobKey) {
      try {
        const redis = await getRedisClient();
        const job = await redis.get(jobKey);
        
        if (job) {
          await redis.set(jobKey, {
            ...job,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            failedAt: new Date().toISOString()
          });
        }
      } catch (redisError) {
        console.error('Error updating job status:', redisError);
      }
    }
    
    return NextResponse.json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 