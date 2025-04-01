'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { departments, files, users } from '@/server/db/schema/schema';
import { eq, sql } from 'drizzle-orm';
import { account } from '@/lib/appwrite/config';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated with Appwrite
    let user;
    try {
      user = await account.get();
    } catch (error) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const departmentId = params.id;

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
      })
      .from(files)
      .innerJoin(users, eq(files.userId, sql`${users.id}::uuid`))
      .where(eq(files.departmentId, sql`${departmentId}::uuid`))
      .orderBy(files.updatedAt);

    return NextResponse.json({ files: results });
  } catch (error) {
    console.error('Error fetching department files:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 