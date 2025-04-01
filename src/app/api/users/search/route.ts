import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, departments } from '@/server/db/schema/schema';
import { and, eq, like, or } from 'drizzle-orm';
import { account } from '@/lib/appwrite/config';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated with Appwrite
    let user;
    try {
      user = await account.get();
    } catch (error) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Build search condition
    const searchConditions = [];
    if (query) {
      searchConditions.push(
        or(
          like(users.name, `%${query}%`),
          like(users.email, `%${query}%`)
        )
      );
    }

    // Search users based on role and department
    const searchResults = await db.query.users.findMany({
      where: and(
        // Add search conditions
        searchConditions.length > 0 ? and(...searchConditions) : undefined,
        eq(users.status, 'active')
      ),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
      
      },
      with: {
        department: {
          columns: {
            name: true,
          },
        },
      },
      limit: 10,
    });

    const formattedUsers = searchResults.map((user: any) => ({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department?.name || 'N/A',
      avatar: user.avatarUrl,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { message: 'Failed to search users' },
      { status: 500 }
    );
  }
} 