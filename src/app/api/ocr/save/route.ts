'use server';

import { NextResponse } from 'next/server';
import { saveOcrResultAsFile, getOcrResult } from '@/lib/appwrite/ocr-operations';
import { rateLimitMiddleware } from '@/middleware/rate-limit';

export async function POST(request: Request) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitMiddleware(request as any, 'ocr:save');
  if (rateLimitResponse.status === 429) return rateLimitResponse;
  
  try {
    // Get request body
    const body = await request.json();
    const { fileId, fileName } = body;
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }
    
    if (!fileName) {
      return NextResponse.json(
        { error: 'File name is required' },
        { status: 400 }
      );
    }
    
    // Get OCR result first
    const ocrResult = await getOcrResult(fileId);
    
    if (!ocrResult || !ocrResult.text) {
      return NextResponse.json(
        { error: 'OCR result not found or processing not complete' },
        { status: 404 }
      );
    }
    
    // Save OCR result as text file
    const result = await saveOcrResultAsFile(fileId, ocrResult.text, fileName);
    
    return NextResponse.json({
      message: 'OCR result saved as text file',
      fileId: result.$id,
      documentId: result.$id
    });
  } catch (error) {
    console.error('Error saving OCR result:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to save OCR result',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 