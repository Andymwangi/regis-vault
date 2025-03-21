import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db/db';
import { files, sharedFiles } from '@/server/db/schema/schema';
import { eq, or } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const fileId = params.id;

    // Check if user has access to the file
    const file = await db.query.files.findFirst({
      where: or(
        eq(files.id, fileId),
        eq(sharedFiles.fileId, fileId)
      ),
      with: {
        shares: true
      }
    });

    if (!file) {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }

    // Check if user owns the file or has been shared with them
    const hasAccess = file.userId === session.user.id || 
                     file.shares.some(share => share.sharedWithUserId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    // Delete the file from disk
    const filePath = join(process.cwd(), 'public', file.url);
    await unlink(filePath);

    // Delete the file record from database
    await db.delete(files).where(eq(files.id, fileId));

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 