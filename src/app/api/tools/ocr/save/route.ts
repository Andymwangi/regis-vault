'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { files, activities, ocrResults } from '@/server/db/schema/schema';
import { account, storage, STORAGE_BUCKETS } from '@/lib/appwrite/config';
import { eq } from 'drizzle-orm';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const getRedisClient = async () => {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  });
  return redis;
};

export async function POST(request: Request) {
  try {
    // Check if user is authenticated with Appwrite
    let user;
    try {
      user = await account.get();
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, fileName, confidence, fileId } = await request.json();

    if (!text || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create a text file with the OCR content
    const textBlob = new Blob([text], { type: 'text/plain' });
    const textFile = new File([textBlob], `${fileName.replace(/\s+/g, '-')}.txt`, { type: 'text/plain' });

    // Upload the text file to Appwrite storage
    const textFileUpload = await storage.createFile(
      STORAGE_BUCKETS.FILES,
      `ocr-${new Date().getTime()}`,
      textFile
    );

    // Get the original OCR result if fileId is provided
    let originalFileData = null;
    if (fileId) {
      try {
        // Get OCR result from PostgreSQL
        const [ocrResult] = await db
          .select()
          .from(ocrResults)
          .where(eq(ocrResults.fileId, fileId));

        if (ocrResult) {
          originalFileData = {
            id: fileId,
            text: ocrResult.text,
            confidence: ocrResult.confidence
          };
        }

        // Also update the Redis cache
        const redis = await getRedisClient();
        const cacheKey = `ocr:job:${fileId}`;
        const cachedJob = await redis.get(cacheKey);
        
        if (cachedJob) {
          await redis.set(cacheKey, {
            ...cachedJob,
            extractedText: text,
            savedToFile: textFileUpload.$id,
            savedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.warn('Could not find original file for OCR results:', error);
      }
    }

    // Start a transaction to save both file and activity
    const result = await db.transaction(async (tx) => {
      // Save file record
      const [file] = await tx.insert(files).values({
        name: fileName,
        type: 'text/plain',
        size: text.length,
        url: storage.getFileView(STORAGE_BUCKETS.FILES, textFileUpload.$id),
        userId: user.$id.substring(0, 36),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // Log the activity
      await tx.insert(activities).values({
        userId: user.$id.substring(0, 36),
        type: 'OCR_SAVE',
        description: `Saved OCR text from document ${fileName}`,
        metadata: {
          confidence,
          fileId: file.id,
          originalFileId: fileId,
          extractedAt: new Date().toISOString(),
        },
      });

      return file;
    });

    return NextResponse.json({
      message: 'OCR text saved successfully',
      file: result
    });
  } catch (error) {
    console.error('Error saving OCR document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save document' },
      { status: 500 }
    );
  }
} 