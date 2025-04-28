'use server';

import { NextResponse } from 'next/server';
import { searchFiles, getSuggestions } from '@/lib/services/searchService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'all';

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const results = await searchFiles(query, limit);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching files:', error);
    return NextResponse.json(
      { error: 'Failed to search files' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { query, limit = 5 } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const suggestions = await getSuggestions(query, limit);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
} 