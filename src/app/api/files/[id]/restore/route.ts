import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { files } from '@/server/db/schema/schema';
import { eq, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const fileId = params.id;

    await db
      .update(files)
      .set({ status: 'active' })
      .where(eq(files.id, sql`${fileId}::uuid`));

    return NextResponse.json({ message: 'File restored successfully' });
  } catch (error) {
    console.error('Error restoring file:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 