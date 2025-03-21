import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { files } from '@/server/db/schema/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function DELETE(
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
      .delete(files)
      .where(eq(files.id, fileId));

    return NextResponse.json({ message: 'File permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting file:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 