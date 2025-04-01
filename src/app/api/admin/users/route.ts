'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, departments } from '@/server/db/schema/schema';
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
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    // Build the where clause
    const conditions = [];

    // Add search condition if provided
    if (search) {
      conditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }

    // Add department filter if provided
    if (department) {
      conditions.push(eq(users.departmentId, department));
    }

    // Add role filter if provided
    if (role && (role === 'admin' || role === 'manager' || role === 'user')) {
      conditions.push(eq(users.role, role));
    }

    // Add status filter if provided
    if (status) {
      conditions.push(eq(users.status, status));
    }

    // Execute query with combined conditions
    const results = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        department: {
          id: departments.id,
          name: departments.name,
        },
      })
      .from(users)
      .innerJoin(departments, eq(users.departmentId, departments.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(users.createdAt);

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 