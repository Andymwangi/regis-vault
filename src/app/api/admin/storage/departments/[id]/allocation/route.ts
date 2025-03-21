import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { departments } from '@/server/db/schema/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { allocatedStorage } = await request.json();
    const departmentId = parseInt(params.id);

    // Update department storage allocation
    await db
      .update(departments)
      .set({ allocatedStorage })
      .where(eq(departments.id, departmentId));

    return NextResponse.json({ message: 'Storage allocation updated successfully' });
  } catch (error) {
    console.error('Error updating storage allocation:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 