'use server';

import { NextResponse } from 'next/server';
import { getOcrResult } from '@/lib/appwrite/ocr-operations';
import { rateLimitMiddleware } from '@/middleware/rate-limit';

export async function GET(request: Request) {
  // Try to apply rate limiting, but don't block if it fails
  try {
    const rateLimitResponse = await Promise.race([
      rateLimitMiddleware(request as any, 'ocr:result'),
      new Promise<Response>((resolve) => {
        setTimeout(() => {
          console.warn('Rate limit middleware timed out, proceeding with request');
          resolve(NextResponse.next());
        }, 1500);
      })
    ]);
    
    if (rateLimitResponse.status === 429) return rateLimitResponse;
  } catch (rateLimitError) {
    console.error('Rate limit middleware error:', rateLimitError);
    // Proceed with the request if rate limiting fails
  }
  
  try {
    // Extract fileId from query params
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }
    
    // Get OCR result from Appwrite database
    const result = await getOcrResult(fileId);
    
    // Log if text is empty
    if (result.status === 'completed' && (!result.text || result.text.trim() === '')) {
      console.warn(`OCR completed for file ${fileId} but no text was extracted`);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting OCR result:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get OCR result',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 