import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { departments, files, users } from '@/server/db/schema/schema';
import { eq, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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
          firstName: users.firstName,
          lastName: users.lastName,
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