'use server';

import { NextResponse } from 'next/server';
import { generateTagSuggestions } from '@/lib/services/taggingService';
import { getCurrentUser } from '@/lib/actions/user.actions';

interface TagSuggestion {
  tag: string;
  category: string;
  confidence: number;
  source?: string;
}

export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
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
    
    // Get tag suggestions - using the more resilient generateTagSuggestions method
    const suggestions = await generateTagSuggestions(fileId);
    
    // Format the response as expected by the frontend
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error generating tag suggestions:', error);
    
    // Return a fallback response with a generic tag when everything fails
    return NextResponse.json({
      suggestions: [{
        tag: 'Uncategorized',
        category: 'general',
        confidence: 0.5,
        source: 'ai'
      }]
    });
  }
}