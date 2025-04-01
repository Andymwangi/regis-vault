'use server';

import { NextResponse } from 'next/server';
import { getOCRStatus } from '@/lib/ocr/processor';
import { rateLimitMiddleware } from '@/middleware/rate-limit';

export async function GET(request: Request) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitMiddleware(request as any, 'ocr:status');
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
    
    // Get OCR status from database
    const status = await getOCRStatus(fileId);
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting OCR status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get OCR status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 