'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { files, users, departments } from '@/server/db/schema/schema';
import { eq, and, or, like } from 'drizzle-orm';
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
    const whereClause = eq(files.status, 'deleted');

    // Add search condition if provided
    const searchCondition = search
      ? or(
          like(files.name, `%${search}%`),
          like(users.name, `%${search}%`)
        )
      : undefined;

    // Add department filter if provided
    const departmentCondition = department
      ? eq(departments.id, department)
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
        status: files.status,
        owner: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        department: {
          id: departments.id,
          name: departments.name,
        },
      })
      .from(files)
      .innerJoin(users, eq(files.userId, users.id))
      .innerJoin(departments, eq(files.departmentId, departments.id))
      .where(finalWhereClause)
      .orderBy(files.updatedAt);

    return NextResponse.json({ files: results });
  } catch (error) {
    console.error('Error fetching trashed files:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 