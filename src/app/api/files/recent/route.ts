import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db/db';
import { files, users } from '@/server/db/schema/schema';
import { and, eq, desc, like, sql, or, gte } from 'drizzle-orm';
import { startOfToday, startOfWeek, startOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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
          eq(files.userId, sql`${session.user.id}::uuid`),
          eq(files.status, 'public'),
          sql`${files.id}::integer IN (
            SELECT "fileId" FROM file_shares 
            WHERE "userId" = ${session.user.id}::uuid
          )`
        ),
        department ? eq(files.departmentId, sql`${department}::uuid`) : undefined,
        search ? like(files.name, `%${search}%`) : undefined,
        timeFilter
      ),
      orderBy: [desc(files.updatedAt)],
      limit: 50,
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        department: {
          columns: {
            name: true,
          },
        },
      },
    });

    const formattedFiles = recentFiles.map(file => ({
      id: file.id.toString(),
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.updatedAt,
      url: file.url,
      status: file.status || 'active',
      owner: file.user ? {
        id: file.user.id.toString(),
        name: `${file.user.firstName} ${file.user.lastName}`,
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