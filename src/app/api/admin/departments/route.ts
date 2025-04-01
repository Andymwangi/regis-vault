'use server';

import { NextResponse } from 'next/server';
import { Query } from 'appwrite';
import { account, databases, DATABASES, COLLECTIONS, sanitizeUserId } from '@/lib/appwrite/config';
import { db } from '@/lib/db';
import { departments } from '@/server/db/schema/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if user is authenticated and is an admin
    try {
      const currentUser = await account.get();
      
      // Get user profile data to check role
      const userProfiles = await databases.listDocuments(
        DATABASES.MAIN,
        COLLECTIONS.DEPARTMENTS,
        [
          Query.equal('userId', sanitizeUserId(currentUser.$id))
        ]
      );
      
      if (userProfiles.documents.length === 0 || 
          userProfiles.documents[0].role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const departmentList = await db
      .select({
        id: departments.id,
        name: departments.name,
      })
      .from(departments)
      .orderBy(asc(departments.name));

    return NextResponse.json({ departments: departmentList });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
} 