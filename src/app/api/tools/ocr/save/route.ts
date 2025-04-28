'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { ID, Query } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { Redis } from '@upstash/redis';

// Initialize Redis client with error handling
const getRedisClient = async () => {
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!redisUrl || !redisToken) {
      console.warn('Redis configuration missing');
      return null;
    }
    
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
      retry: {
        retries: 2,
        backoff: (retryCount) => Math.min(Math.exp(retryCount) * 50, 500)
      }
    });
    
    // Test connection with timeout
    const pingPromise = redis.ping();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Redis connection timeout')), 1000);
    });
    
    await Promise.race([pingPromise, timeoutPromise]);
    return redis;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    return null;
  }
};

export async function POST(request: Request) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, fileName, confidence, fileId } = await request.json();

    if (!text || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { storage, databases } = await createAdminClient();

    // Create a text file with the OCR content
    const textBlob = new Blob([text], { type: 'text/plain' });
    const arrayBuffer = await textBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload the text file to Appwrite storage
    const fileNameSanitized = `${fileName.replace(/\s+/g, '-')}.txt`;
    const inputFile = InputFile.fromBuffer(buffer, fileNameSanitized);
    const textFileUpload = await storage.createFile(
      fullConfig.storageId,
      `ocr-${new Date().getTime()}`,
      inputFile
    );

    // Get the original OCR result if fileId is provided
    let originalFileData = null;
    if (fileId) {
      try {
        // Get OCR result from Appwrite
        const ocrResult = await databases.listDocuments(
          fullConfig.databaseId,
          fullConfig.ocrResultsCollectionId,
          [Query.equal('fileId', [fileId])]
        );

        if (ocrResult.total > 0) {
          originalFileData = {
            id: fileId,
            text: ocrResult.documents[0].text,
            confidence: ocrResult.documents[0].confidence
          };
        }

        // Also update the Redis cache
        try {
          const redis = await Promise.race([
            getRedisClient(),
            new Promise<null>((resolve) => {
              setTimeout(() => {
                console.warn('Redis client initialization timed out');
                resolve(null);
              }, 1500);
            })
          ]);
          
          if (redis) {
            const cacheKey = `ocr:job:${fileId}`;
            // Set timeout for Redis operations
            await Promise.race([
              redis.get(cacheKey).then(async (cachedJob) => {
                if (cachedJob) {
                  await redis.set(cacheKey, {
                    ...cachedJob,
                    extractedText: text,
                    savedToFile: textFileUpload.$id,
                    savedAt: new Date().toISOString()
                  });
                }
              }),
              new Promise((_, reject) => {
                setTimeout(() => {
                  console.warn('Redis operation timed out');
                }, 1000);
              })
            ]);
          }
        } catch (redisError) {
          console.error('Redis cache update failed:', redisError);
          // Continue with the rest of the operation even if Redis fails
        }
      } catch (error) {
        console.warn('Could not find original file for OCR results:', error);
      }
    }

    // Create file document in Appwrite
    const fileUrl = `${fullConfig.endpoint}/storage/buckets/${fullConfig.storageId}/files/${textFileUpload.$id}/view?project=${fullConfig.projectId}`;
    
    const fileData = {
      name: fileNameSanitized,
      type: 'document',
      extension: 'txt',
      size: text.length,
      url: fileUrl,
      ownerId: currentUser.$id,
      departmentId: currentUser.department || null,
      sharedWith: [],
      bucketFieldId: textFileUpload.$id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };
    
    const fileDocument = await databases.createDocument(
      fullConfig.databaseId,
      fullConfig.filesCollectionId,
      ID.unique(),
      fileData
    );

    // Log the activity
    await databases.createDocument(
      fullConfig.databaseId,
      'activity_logs',
      ID.unique(),
      {
        userId: currentUser.$id,
        type: 'OCR_SAVE',
        description: `Saved OCR text from document ${fileName}`,
        metadata: {
          confidence,
          fileId: fileDocument.$id,
          originalFileId: fileId,
          extractedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString()
      }
    );

    return NextResponse.json({
      message: 'OCR text saved successfully',
      file: fileDocument
    });
  } catch (error) {
    console.error('Error saving OCR document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save document' },
      { status: 500 }
    );
  }
} 