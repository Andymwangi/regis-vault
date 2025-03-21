import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { files } from '@/server/db/schema/schema';
import { sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const results = await db
      .select({
        type: files.type,
        count: sql<number>`count(*)::int`,
        totalSize: sql<number>`sum(${files.size})::int`,
      })
      .from(files)
      .groupBy(files.type)
      .orderBy(sql`sum(${files.size}) desc`);

    return NextResponse.json({ distribution: results });
  } catch (error) {
    console.error('Error fetching file type distribution:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 