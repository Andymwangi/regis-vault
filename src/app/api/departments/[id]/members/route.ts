'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { departments, users } from '@/server/db/schema/schema';
import { eq } from 'drizzle-orm';
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
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.departmentId, departmentId))
      .orderBy(users.name);

    return NextResponse.json({ members: results });
  } catch (error) {
    console.error('Error fetching department members:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 