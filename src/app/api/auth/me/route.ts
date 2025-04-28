'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] /api/auth/me: Checking user session');
    // Get the user session
    const session = await getSession();
    
    if (!session) {
      console.log('[API] /api/auth/me: No session found, returning 401');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    console.log(`[API] /api/auth/me: Session found for user ID: ${session.id}, account ID: ${session.accountId}`);
    
    // Get the complete user data from the database
    const { databases } = await createAdminClient();
    console.log(`[API] /api/auth/me: Fetching user data for account ID: ${session.accountId}`);
    
    const result = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.equal("accountId", [session.accountId])]
    );
    
    if (result.total === 0) {
      console.log(`[API] /api/auth/me: User not found with account ID: ${session.accountId}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = result.documents[0];
    console.log(`[API] /api/auth/me: User found - ID: ${user.$id}, Role: ${user.role}`);
    
    // Return the user data
    return NextResponse.json({
      id: user.$id,
      accountId: user.accountId,
      name: user.fullName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      department: user.department,
      needsProfileCompletion: !user.department || !user.role
    });
  } catch (error) {
    console.error('[API] /api/auth/me: Error fetching user:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 