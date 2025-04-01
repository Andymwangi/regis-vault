import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { departments } from '@/server/db/schema/schema';
import { eq } from 'drizzle-orm';
import { account, getUserProfileById } from '@/lib/appwrite/config';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated with Appwrite
    try {
      const user = await account.get();
      
      // Verify admin role
      const userProfileData = await getUserProfileById(user.$id);
      if (!userProfileData || userProfileData.profile.role !== 'admin') {
        return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch (error) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { allocatedStorage } = await request.json();
    const departmentId = params.id;

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