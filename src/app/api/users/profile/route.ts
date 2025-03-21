import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db/db';
import { users } from '@/server/db/schema/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateProfileSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: 'Invalid data', errors: result.error.errors },
        { status: 400 }
      );
    }

    const { firstName, lastName } = result.data;

    const [updatedUser] = await db
      .update(users)
      .set({
        firstName,
        lastName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
      .returning();

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { message: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 