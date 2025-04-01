'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { files, sharedFiles, users, departments } from '@/server/db/schema/schema';
import { eq, and, or, like, sql } from 'drizzle-orm';
import { account } from '@/lib/appwrite/config';

export async function GET(request: Request) {
  try {
    // Check if user is authenticated with Appwrite
    let user;
    try {
      user = await account.get();
    } catch (error) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department');

    // Build the where clause
    const whereClause = eq(sharedFiles.sharedWithUserId, sql`${user.$id}::uuid`);

    // Add search condition if provided
    const searchCondition = search
      ? or(
          like(files.name, `%${search}%`),
          like(users.name, `%${search}%`)
        )
      : undefined;

    // Add department filter if provided
    const departmentCondition = department
      ? eq(departments.id, sql`${department}::uuid`)
      : undefined;

    // Combine all conditions
    const finalWhereClause = and(
      whereClause,
      ...(searchCondition ? [searchCondition] : []),
      ...(departmentCondition ? [departmentCondition] : [])
    );

    // Execute query with combined conditions
    const results = await db
      .select({
        id: files.id,
        name: files.name,
        type: files.type,
        size: files.size,
        url: files.url,
        createdAt: files.createdAt,
        updatedAt: files.updatedAt,
        owner: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        department: {
          id: departments.id,
          name: departments.name,
        },
        share: {
          createdAt: sharedFiles.createdAt,
        },
      })
      .from(files)
      .innerJoin(sharedFiles, eq(sql`${files.id}::integer`, sharedFiles.fileId))
      .innerJoin(users, eq(files.userId, sql`${users.id}::uuid`))
      .innerJoin(departments, eq(files.departmentId, sql`${departments.id}::uuid`))
      .where(finalWhereClause);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching shared files:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 