'use server';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { rateLimitMiddleware } from '@/middlewares/rate-limit';
import { Query } from 'node-appwrite';

export async function GET(request: Request) {
  // Try to apply rate limiting
  try {
    const rateLimitResponse = await Promise.race([
      rateLimitMiddleware(request as any, 'ocr:status'),
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
    // Get file ID from query parameters
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }
    
    // Get current user
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Create admin client
    const { databases } = await createAdminClient();
    
    // Get OCR results with file ID
    const results = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.ocrResultsCollectionId,
      [Query.equal('fileId', [fileId])]
    );
    
    if (results.documents.length === 0) {
      return NextResponse.json({
        status: 'pending',
        message: 'OCR processing has not started yet'
      });
    }
    
    const ocrResult = results.documents[0];
    
    // Check the OCR status
    // Full status detail response
    let response: {
      status: string;
      message: string;
      error: any;
      createdAt: string;
      updatedAt: string;
      processingTime: number;
      progress: number;
      id: string;
      pageCount: number;
      confidence: number;
      hasText: boolean;
      suggestBrowserOCR?: boolean;
    } = {
      status: ocrResult.status,
      message: getStatusMessage(ocrResult.status),
      error: ocrResult.error || null,
      createdAt: ocrResult.createdAt,
      updatedAt: ocrResult.updatedAt,
      processingTime: ocrResult.processingTime || 0,
      progress: calculateProgress(ocrResult),
      id: ocrResult.$id,
      pageCount: ocrResult.pageCount || 0,
      confidence: ocrResult.confidence || 0,
      hasText: ocrResult.text ? ocrResult.text.length > 0 : false
    };
    
    // If status is processing but it's been more than 60 seconds, suggest browser OCR
    if (ocrResult.status === 'processing') {
      const createdTime = new Date(ocrResult.createdAt).getTime();
      const now = Date.now();
      const elapsedSeconds = (now - createdTime) / 1000;
      
      if (elapsedSeconds > 60) {
        response.message = 'OCR processing is taking longer than expected. Consider trying browser-based OCR.';
        response.suggestBrowserOCR = true;
      }
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error checking OCR status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check OCR status',
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      },
      { status: 500 }
    );
  }
}

// Helper function to get user-friendly status messages
function getStatusMessage(status: string): string {
  switch (status) {
    case 'pending':
      return 'OCR processing is waiting to start';
    case 'processing':
      return 'OCR processing is in progress';
    case 'completed':
      return 'OCR processing completed successfully';
    case 'failed':
      return 'OCR processing failed';
    case 'error':
      return 'An error occurred during OCR processing';
    default:
      return 'Unknown status';
  }
}

// Calculate approximate progress based on metadata and status
function calculateProgress(ocrResult: any): number {
  let progress = 0;
  
  if (ocrResult.status === 'completed') {
    return 100;
  }
  
  if (ocrResult.status === 'failed' || ocrResult.status === 'error') {
    return 0;
  }
  
  if (ocrResult.status === 'pending') {
    return 5; // Just starting
  }
  
  // If processing, try to estimate progress
  if (ocrResult.status === 'processing') {
    try {
      const metadata = JSON.parse(ocrResult.metadata || '{}');
      if (metadata.progress) {
        return Math.min(95, Math.max(10, metadata.progress));
      }
      
      // If no explicit progress, estimate based on time
      const createdTime = new Date(ocrResult.createdAt).getTime();
      const now = Date.now();
      const elapsedSeconds = (now - createdTime) / 1000;
      
      // Assume typical OCR takes about 30 seconds
      progress = Math.min(95, Math.max(10, (elapsedSeconds / 30) * 100));
    } catch (e) {
      progress = 50; // Default to 50% if we can't calculate
    }
  }
  
  return Math.round(progress);
} 