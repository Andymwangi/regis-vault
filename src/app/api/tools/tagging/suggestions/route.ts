'use server';

import { NextResponse } from 'next/server';
import { generateTagSuggestions } from '@/lib/services/taggingService';
import { getOCRResult } from '@/lib/ocr/processor';
import { account } from '@/lib/appwrite/config';

interface TagSuggestion {
  tag: string;
  category: string;
  confidence: number;
  source?: string;
}

export async function GET(request: Request) {
  try {
    // Check if user is authenticated with Appwrite
    try {
      await account.get();
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get OCR text content for the file
    let textContent = '';
    try {
      const ocrResult = await getOCRResult(fileId);
      if (ocrResult && ocrResult.text) {
        textContent = ocrResult.text;
      }
    } catch (error) {
      console.warn('OCR result not found, proceeding with empty text:', error);
    }

    // Generate tag suggestions based on the content
    const suggestions = await generateTagSuggestions(fileId, textContent);

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error generating tag suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate tag suggestions' },
      { status: 500 }
    );
  }
} 