'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const getRedisClient = async () => {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  });
  return redis;
};

export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is an admin
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    // Get Redis client
    const redis = await getRedisClient();
    
    // Scan for all OCR job keys
    const keys = await redis.keys('ocr:job:*');
    
    // Get all job data
    const jobs = [];
    for (const key of keys) {
      const jobData = await redis.get(key);
      if (jobData) {
        // Extract fileId from key (format: ocr:job:fileId)
        const fileId = key.split(':')[2];
        jobs.push({
          id: key,
          fileId,
          ...jobData,
        });
      }
    }
    
    // Define the type for job data
    interface OCRJob {
      id: string;
      fileId: string;
      createdAt?: string;
      status?: string;
      [key: string]: any; // For other properties we don't care about in sorting
    }

    // Sort jobs by creation time (newest first)
    const sortedJobs = jobs.sort((a: OCRJob, b: OCRJob) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    return NextResponse.json({ 
      jobs: sortedJobs.slice(0, 20) // Limit to 20 most recent jobs
    });
  } catch (error) {
    console.error('Error fetching OCR jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OCR jobs' },
      { status: 500 }
    );
  }
} 