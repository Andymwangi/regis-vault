'use server';

import { NextResponse } from 'next/server';
import { getOCRResult } from '@/lib/ocr/processor';
import { rateLimitMiddleware } from '@/middleware/rate-limit';

export async function GET(request: Request) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitMiddleware(request as any, 'ocr:result');
  if (rateLimitResponse.status === 429) return rateLimitResponse;
  
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
    
    // Get OCR result from database
    const result = await getOCRResult(fileId);
    
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