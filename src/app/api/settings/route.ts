import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db/db';
import { users, settings } from '@/server/db/schema/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userSettings = await db.query.settings.findFirst({
      where: eq(settings.key, sql`user_${session.user.id}::uuid`),
    });

    return NextResponse.json(userSettings?.value || {});
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { message: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { theme, notifications, emailNotifications } = body;

    const [updatedSettings] = await db
      .update(settings)
      .set({
        value: { theme, notifications, emailNotifications },
        updatedAt: new Date(),
      })
      .where(eq(settings.key, sql`user_${session.user.id}::uuid`))
      .returning();

    return NextResponse.json(updatedSettings.value);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { message: 'Failed to update settings' },
      { status: 500 }
    );
  }
} 