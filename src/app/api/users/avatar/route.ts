import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db/db';
import { users } from '@/server/db/schema/schema';
import { eq } from 'drizzle-orm';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const AVATAR_DIR = join(process.cwd(), 'public', 'avatars');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { message: 'File must be an image' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    const ext = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${ext}`;
    const filePath = join(AVATAR_DIR, fileName);
    const avatarUrl = `/avatars/${fileName}`;

    // Save file to disk
    const buffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(buffer));

    // Update user's avatar URL in database
    const [updatedUser] = await db
      .update(users)
      .set({
        avatarUrl: avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
      .returning();

    return NextResponse.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { message: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
} 