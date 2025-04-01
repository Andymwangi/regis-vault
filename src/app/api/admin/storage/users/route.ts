'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, files, departments } from '@/server/db/schema/schema';
import { eq, sql } from 'drizzle-orm';
import { account } from '@/lib/appwrite/config';

export async function GET() {
  try {
    // Check if user is authenticated with Appwrite
    let user;
    try {
      user = await account.get();
    } catch (error) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const results = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        department: departments.name,
        usedStorage: sql<number>`COALESCE(SUM(${files.size}), 0)`,
        fileCount: sql<number>`COUNT(${files.id})::int`,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(files, eq(files.userId, users.id))
      .groupBy(users.id, departments.name)
      .orderBy(sql`COALESCE(SUM(${files.size}), 0)`);

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error('Error fetching user storage data:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 