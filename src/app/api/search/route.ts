'use server';

import { NextResponse } from 'next/server';
import { Query } from 'appwrite';
import { account, databases, DATABASES, COLLECTIONS, sanitizeUserId } from '@/lib/appwrite/config';
import { SearchService } from '@/lib/services/searchService';

export async function GET(request: Request) {
  try {
    // Get the current user using Appwrite
    try {
      const currentUser = await account.get();
      
      // Get user profile data
      const userProfiles = await databases.listDocuments(
        DATABASES.MAIN,
        COLLECTIONS.DEPARTMENTS,
        [
          Query.equal('userId', sanitizeUserId(currentUser.$id))
        ]
      );
      
      if (userProfiles.documents.length === 0) {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
      }
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const results = await SearchService.searchFiles(query, limit);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching files:', error);
    return NextResponse.json(
      { error: 'Failed to search files' },
      { status: 500 }
    );
  }
} 