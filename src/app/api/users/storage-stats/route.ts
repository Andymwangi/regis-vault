import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db/db';
import { files } from '@/server/db/schema/schema';
import { eq, and, sql } from 'drizzle-orm';

const FILE_TYPES = {
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  spreadsheet: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  other: []
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get total size of all files
    const totalSize = await db
      .select({ 
        size: sql<number>`sum(${files.size})` 
      })
      .from(files)
      .where(
        and(
          eq(files.userId, userId),
          eq(files.status, 'active')
        )
      );

    // Get size by file type
    const documentSize = await getFileSizeByTypes(userId, FILE_TYPES.document);
    const imageSize = await getFileSizeByTypes(userId, FILE_TYPES.image);
    const spreadsheetSize = await getFileSizeByTypes(userId, FILE_TYPES.spreadsheet);
    const otherSize = await getFileSizeByTypes(userId, FILE_TYPES.other, true);

    const totalGB = 20; // 20GB total storage limit
    const usedBytes = totalSize[0]?.size || 0;
    const usedGB = bytesToGB(usedBytes);

    return NextResponse.json({
      total: totalGB,
      used: usedGB,
      breakdown: [
        { type: 'Documents', size: bytesToGB(documentSize), color: 'bg-red-400' },
        { type: 'Images', size: bytesToGB(imageSize), color: 'bg-green-400' },
        { type: 'Spreadsheets', size: bytesToGB(spreadsheetSize), color: 'bg-blue-400' },
        { type: 'Other', size: bytesToGB(otherSize), color: 'bg-yellow-400' }
      ]
    });
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    return NextResponse.json(
      { message: 'Failed to fetch storage statistics' },
      { status: 500 }
    );
  }
}

async function getFileSizeByTypes(userId: string, types: string[], isOther: boolean = false) {
  const result = await db
    .select({
      size: sql<number>`sum(${files.size})`
    })
    .from(files)
    .where(
      and(
        eq(files.userId, userId),
        eq(files.status, 'active'),
        isOther
          ? sql`${files.type} NOT IN (${types})`
          : sql`${files.type} IN (${types})`
      )
    );

  return result[0]?.size || 0;
}

function bytesToGB(bytes: number): number {
  return Number((bytes / (1024 * 1024 * 1024)).toFixed(2));
} 