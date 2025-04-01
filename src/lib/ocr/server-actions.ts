'use server';

import { processOCR } from './processor';
import { Redis } from '@upstash/redis';

/**
 * This file contains server-side actions for OCR processing
 */

// Initialize Redis client
const getRedisClient = async () => {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  });
  return redis;
};

/**
 * Enqueues a file for OCR processing
 */
export async function enqueueOCRJob(fileId: string, fileUrl: string) {
  try {
    console.log(`Enqueueing OCR job for file: ${fileId}`);
    
    // Store job in Redis
    const redis = await getRedisClient();
    await redis.set(`ocr:job:${fileId}`, {
      fileId,
      fileUrl,
      status: 'queued',
      createdAt: new Date().toISOString(),
    });
    
    // Start processing the OCR job immediately
    console.log(`Starting OCR processing for file: ${fileId}`);
    
    // Using setTimeout to make this non-blocking
    setTimeout(async () => {
      try {
        const result = await processOCR(fileId, fileUrl);
        console.log(`OCR processing completed for file: ${fileId}`);
        // Update Redis record with completion
        const redis = await getRedisClient();
        await redis.set(`ocr:job:${fileId}`, {
          fileId,
          fileUrl,
          status: 'completed',
          result,
          completedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`OCR processing failed for file: ${fileId}:`, error);
        // Update Redis record with error
        const redis = await getRedisClient();
        await redis.set(`ocr:job:${fileId}`, {
          fileId,
          fileUrl,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          failedAt: new Date().toISOString(),
        });
      }
    }, 0);
    
    return true;
  } catch (error) {
    console.error('Error enqueuing OCR job:', error);
    return false;
  }
}

/**
 * Gets the status of an OCR job
 */
export async function getOCRJobStatus(fileId: string) {
  try {
    const redis = await getRedisClient();
    const job = await redis.get(`ocr:job:${fileId}`);
    return job || { status: 'not_found' };
  } catch (error) {
    console.error('Error getting OCR job status:', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
} 