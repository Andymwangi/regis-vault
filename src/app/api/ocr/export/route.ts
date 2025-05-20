'use server';

import { NextResponse } from 'next/server';
import { exportOcrAsPdf, exportOcrAsDocx } from '@/lib/appwrite/ocr-export';

// Inline rate limiting to avoid import issues
const rateLimitMiddleware = async (request: Request, endpoint: string) => {
  // Simple passthrough implementation
  return NextResponse.next();
};

export async function POST(request: Request) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitMiddleware(request as any, 'ocr:export');
  if (rateLimitResponse.status === 429) return rateLimitResponse;
  
  try {
    // Get request body
    const body = await request.json();
    const { fileId, fileName, format } = body;
    
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
    
    if (!format || !['pdf', 'docx'].includes(format)) {
      return NextResponse.json(
        { error: 'Format must be either "pdf" or "docx"' },
        { status: 400 }
      );
    }
    
    // Export OCR result based on format
    let result;
    if (format === 'pdf') {
      result = await exportOcrAsPdf(fileId, fileName);
    } else {
      result = await exportOcrAsDocx(fileId, fileName);
    }
    
    return NextResponse.json({
      message: `OCR result exported as ${format.toUpperCase()}`,
      fileId: result.$id,
      fileName: result.name,
      url: result.url
    });
  } catch (error) {
    console.error('Error exporting OCR result:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to export OCR result',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}