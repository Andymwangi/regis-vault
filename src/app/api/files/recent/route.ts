'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'appwrite';
import { account, databases, DATABASES, COLLECTIONS, sanitizeUserId } from '@/lib/appwrite/config';
import { db } from '@/lib/db';
import { files, users } from '@/server/db/schema/schema';
import { and, eq, desc, like, sql, or, gte } from 'drizzle-orm';
import { startOfToday, startOfWeek, startOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    // Get the current user using Appwrite
    let currentUser;
    try {
      currentUser = await account.get();
      
      // Get user profile data
      const userProfiles = await databases.listDocuments(
        DATABASES.MAIN,
        COLLECTIONS.DEPARTMENTS,
        [
          Query.equal('userId', sanitizeUserId(currentUser.$id))
        ]
      );
      
      if (userProfiles.documents.length === 0) {
        return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
      }
    } catch (error) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const timeRange = searchParams.get('timeRange') || 'all';
    const department = searchParams.get('department');

    let timeFilter;
    const now = new Date();

    switch (timeRange) {
      case 'today':
        timeFilter = gte(files.createdAt, startOfToday());
        break;
      case 'week':
        timeFilter = gte(files.createdAt, startOfWeek(now));
        break;
      case 'month':
        timeFilter = gte(files.createdAt, startOfMonth(now));
        break;
      default:
        timeFilter = undefined;
    }

    const recentFiles = await db.query.files.findMany({
      where: and(
        eq(files.status, 'active'),
        or(
          eq(files.userId, currentUser.$id),
          eq(files.status, 'public'),
          sql`${files.id}::integer IN (
            SELECT "fileId" FROM file_shares 
            WHERE "userId" = ${currentUser.$id}::uuid
          )`
        ),
        department ? eq(files.departmentId, department) : undefined,
        search ? like(files.name, `%${search}%`) : undefined,
        timeFilter
      ),
      orderBy: [desc(files.updatedAt)],
      limit: 50,
      with: {
        user: {
          columns: {
            id: true,
            name: true,  // Using name instead of firstName/lastName
          },
        },
        department: {
          columns: {
            name: true,
          },
        },
      },
    });

    const formattedFiles = recentFiles.map((file: any) => ({
      id: file.id.toString(),
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.updatedAt,
      url: file.url,
      status: file.status || 'active',
      owner: file.user ? {
        id: file.user.id.toString(),
        name: file.user.name,  // Using name field directly
        avatar: file.user.avatarUrl,
      } : null,
      department: file.department?.name || 'Unknown',
      shared: file.status === 'public',
      sharedWith: [], // You'll need to implement file shares query if needed
      createdAt: file.createdAt || new Date(),
      updatedAt: file.updatedAt || new Date()
    }));

    return NextResponse.json({
      files: formattedFiles,
    });
  } catch (error) {
    console.error('Error fetching recent files:', error);
    return NextResponse.json(
      { message: 'Failed to fetch recent files' },
      { status: 500 }
    );
  }
} 